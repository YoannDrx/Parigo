import "server-only";

import { createHash } from "node:crypto";
import { EncryptJWT, jwtDecrypt, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import type { MemberProfile } from "@/types";
import { getParigoSessionConfig } from "./config";
import { HarvestError } from "./errors";
import { refreshMember, type HarvestLoginResult } from "./member";

const LEGACY_COOKIE_NAME = "parigo_session";
const COOKIE_NAME = process.env.NODE_ENV === "production"
  ? "__Host-parigo_session"
  : LEGACY_COOKIE_NAME;

export interface HarvestSessionPayload {
  memberToken: string;
  memberExpiresAt: number;
  persistentToken: string;
  persistentExpiresAt: number;
  user: HarvestSessionUser;
}

export type HarvestSessionUser = Pick<MemberProfile, "id" | "email" | "firstName" | "lastName" | "status"> & {
  image?: string;
  createdAt?: string;
};

function sessionUser(profile: MemberProfile & { createdAt?: string; image?: string }): HarvestSessionUser {
  return {
    id: profile.id,
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    status: profile.status,
    image: profile.image,
    createdAt: profile.createdAt,
  };
}

async function encryptionKey(): Promise<Uint8Array> {
  return createHash("sha256").update(getParigoSessionConfig().sessionSecret, "utf8").digest();
}

export async function sealHarvestSession(payload: HarvestSessionPayload): Promise<string> {
  return new EncryptJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM", typ: "JWT", v: 1 })
    .setIssuedAt()
    .setExpirationTime(Math.floor(payload.persistentExpiresAt / 1000))
    .encrypt(await encryptionKey());
}

export async function unsealHarvestSession(value: string): Promise<HarvestSessionPayload | null> {
  try {
    const { payload, protectedHeader } = await jwtDecrypt(value, await encryptionKey(), {
      keyManagementAlgorithms: ["dir"],
      contentEncryptionAlgorithms: ["A256GCM"],
    });
    if (protectedHeader.v !== 1) return null;
    if (!payload.memberToken || !payload.persistentToken || !payload.user) return null;
    return payload as unknown as HarvestSessionPayload;
  } catch {
    return null;
  }
}

function toPayload(result: HarvestLoginResult): HarvestSessionPayload {
  return {
    memberToken: result.memberToken,
    memberExpiresAt: result.memberExpiresAt,
    persistentToken: result.persistentToken,
    persistentExpiresAt: result.persistentExpiresAt,
    user: sessionUser(result.profile),
  };
}

export async function setHarvestSession(result: HarvestLoginResult | HarvestSessionPayload): Promise<void> {
  const payload = "profile" in result ? toPayload(result) : result;
  const store = await cookies();
  store.set(COOKIE_NAME, await sealHarvestSession(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(payload.persistentExpiresAt),
  });
}

export async function clearHarvestSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
  if (COOKIE_NAME !== LEGACY_COOKIE_NAME) store.delete(LEGACY_COOKIE_NAME);
}

export async function readHarvestSession(options: { refresh?: boolean; migrateLegacy?: boolean } = {}): Promise<HarvestSessionPayload | null> {
  const store = await cookies();
  const currentValue = store.get(COOKIE_NAME)?.value;
  const legacyValue = COOKIE_NAME === LEGACY_COOKIE_NAME
    ? undefined
    : store.get(LEGACY_COOKIE_NAME)?.value;
  const value = currentValue || legacyValue;
  if (!value) return null;
  const payload = await unsealHarvestSession(value);
  if (!payload || payload.persistentExpiresAt <= Date.now()) {
    store.delete(COOKIE_NAME);
    return null;
  }
  if (legacyValue && !currentValue && options.migrateLegacy !== false) {
    await setHarvestSession(payload);
    store.delete(LEGACY_COOKIE_NAME);
  }
  if (payload.memberExpiresAt > Date.now() + 60_000 || options.refresh === false) return payload;
  try {
    const refreshed = toPayload(await refreshMember(payload.persistentToken));
    if (!refreshed.user.id) refreshed.user = payload.user;
    await setHarvestSession(refreshed);
    return refreshed;
  } catch {
    store.delete(COOKIE_NAME);
    return null;
  }
}

export async function requireHarvestSession(): Promise<HarvestSessionPayload> {
  const session = await readHarvestSession();
  if (!session) throw new HarvestError("Authentication required", "UNAUTHENTICATED", 401);
  return session;
}

export function publicSession(payload: HarvestSessionPayload | null) {
  if (!payload) return null;
  const profile = payload.user;
  return {
    user: {
      id: profile.id,
      email: profile.email,
      name: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.email,
      image: profile.image || null,
      role: "USER",
      createdAt: profile.createdAt || new Date().toISOString(),
    },
    session: { expiresAt: new Date(payload.persistentExpiresAt).toISOString() },
  };
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) {
    if (request.headers.get("sec-fetch-site") === "same-origin") return;
    throw new HarvestError("Missing request origin", "FORBIDDEN", 403);
  }
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "");
  if (!host || origin !== `${protocol}://${host}`) {
    throw new HarvestError("Invalid request origin", "FORBIDDEN", 403);
  }
}
