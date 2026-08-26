import "server-only";

import { createHash } from "node:crypto";
import { EncryptJWT, jwtDecrypt, type JWTPayload } from "jose";
import { HarvestError } from "./errors";

export type AimsReferenceKind = "upload-pending" | "upload" | "url";

export interface AimsReferencePayload {
  kind: AimsReferenceKind;
  resourceUrl: string;
  harvestType: string;
  nonce: string;
  fileName?: string;
  contentType?: string;
}

function secret(): string {
  const value = process.env.AIMS_REFERENCE_TOKEN_SECRET?.trim();
  if (value && value.length >= 32) return value;
  throw new HarvestError(
    "AIMS reference tokens are not configured",
    "AIMS_FEATURE_UNAVAILABLE",
    503,
    false,
  );
}

async function encryptionKey(): Promise<Uint8Array> {
  return createHash("sha256").update(secret(), "utf8").digest();
}

export function aimsReferenceTokensConfigured(): boolean {
  return (process.env.AIMS_REFERENCE_TOKEN_SECRET?.trim().length ?? 0) >= 32;
}

export async function sealAimsReference(
  payload: AimsReferencePayload,
  expiresInSeconds = 30 * 60,
): Promise<string> {
  return new EncryptJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM", typ: "JWT", v: 1 })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .encrypt(await encryptionKey());
}

export async function unsealAimsReference(
  value: string,
  expectedKinds: AimsReferenceKind[],
): Promise<AimsReferencePayload> {
  try {
    const { payload, protectedHeader } = await jwtDecrypt(value, await encryptionKey(), {
      keyManagementAlgorithms: ["dir"],
      contentEncryptionAlgorithms: ["A256GCM"],
    });
    if (protectedHeader.v !== 1) throw new Error("Unsupported token version");
    const reference = payload as unknown as AimsReferencePayload;
    if (
      !expectedKinds.includes(reference.kind)
      || !reference.resourceUrl
      || !reference.harvestType
      || !reference.nonce
    ) {
      throw new Error("Invalid reference payload");
    }
    return reference;
  } catch (error) {
    if (error instanceof HarvestError) throw error;
    throw new HarvestError("AIMS reference is invalid or expired", "VALIDATION_FAILED", 400, false);
  }
}
