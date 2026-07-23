import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { EncryptJWT } from "jose";
import type { BrowserContext } from "@playwright/test";

function readSessionSecret() {
  if (process.env.HARVEST_SESSION_SECRET?.trim()) return process.env.HARVEST_SESSION_SECRET.trim();
  for (const file of [".env"]) {
    if (!existsSync(file)) continue;
    const match = readFileSync(file, "utf8").match(/^HARVEST_SESSION_SECRET=(.*)$/m);
    if (match?.[1]) return match[1].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  throw new Error("HARVEST_SESSION_SECRET est requis pour les parcours E2E du compte.");
}

export async function installMemberSession(context: BrowserContext, baseURL: string) {
  const now = Date.now();
  const persistentExpiresAt = now + 24 * 60 * 60 * 1000;
  const payload = {
    memberToken: "e2e-member-token",
    memberExpiresAt: now + 60 * 60 * 1000,
    persistentToken: "e2e-persistent-token",
    persistentExpiresAt,
    user: {
      id: "member-1",
      email: "yoann@parigo.test",
      firstName: "Yoann",
      lastName: "Andrieux",
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  };
  const key = createHash("sha256").update(readSessionSecret(), "utf8").digest();
  const value = await new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM", typ: "JWT", v: 1 })
    .setIssuedAt()
    .setExpirationTime(Math.floor(persistentExpiresAt / 1000))
    .encrypt(key);
  const secure = new URL(baseURL).protocol === "https:";
  await context.addCookies([{
    name: secure ? "__Host-parigo_session" : "parigo_session",
    value,
    url: baseURL,
    httpOnly: true,
    secure,
    sameSite: "Lax",
    expires: Math.floor(persistentExpiresAt / 1000),
  }]);
}
