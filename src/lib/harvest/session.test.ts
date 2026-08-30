// @vitest-environment node

import { beforeAll, describe, expect, it } from "vitest";
import type { HarvestSessionPayload } from "./session";

const payload: HarvestSessionPayload = {
  memberToken: "member-token-that-is-never-exposed-to-the-client",
  memberExpiresAt: Date.now() + 60_000,
  memberUtcOffsetHours: 10,
  memberUtcOffsetResolved: true,
  persistentToken: "persistent-token-that-is-never-exposed-to-the-client",
  persistentExpiresAt: Date.now() + 3_600_000,
  user: { id: "member-1", email: "test@example.com", firstName: "Test", lastName: "Parigo", status: "active" },
};

describe("Parigo session JWE", () => {
  beforeAll(() => {
    process.env.HARVEST_SESSION_SECRET = "a-test-only-session-secret-with-enough-entropy";
  });

  it("uses a five-part compact JWE and restores the minimal session", async () => {
    const { sealHarvestSession, unsealHarvestSession } = await import("./session");
    const token = await sealHarvestSession(payload);
    expect(token.split(".")).toHaveLength(5);
    await expect(unsealHarvestSession(token)).resolves.toMatchObject({
      memberToken: payload.memberToken,
      memberUtcOffsetHours: 10,
      persistentToken: payload.persistentToken,
      user: { id: "member-1" },
    });
  });

  it("rejects a modified token", async () => {
    const { sealHarvestSession, unsealHarvestSession } = await import("./session");
    const token = await sealHarvestSession(payload);
    const parts = token.split(".");
    const authenticationTag = parts[4]!;
    parts[4] = `${authenticationTag.startsWith("A") ? "B" : "A"}${authenticationTag.slice(1)}`;
    const tampered = parts.join(".");
    await expect(unsealHarvestSession(tampered)).resolves.toBeNull();
  });
});
