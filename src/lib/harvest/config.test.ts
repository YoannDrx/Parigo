import { afterEach, describe, expect, it, vi } from "vitest";

describe("server configuration boundaries", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("loads the public catalogue without a session secret", async () => {
    vi.stubEnv("HARVEST_ACCESS_KEY", "catalog-access-key");
    vi.stubEnv("HARVEST_CLIENT_ID", "catalog-client-id");
    vi.stubEnv("HARVEST_CLIENT_SECRET", "catalog-client-secret");
    vi.stubEnv("HARVEST_SESSION_SECRET", "");
    const { getHarvestApiConfig, getParigoSessionConfig, isParigoSessionConfigured } = await import("./config");
    expect(getHarvestApiConfig()).toMatchObject({
      accessKey: "catalog-access-key",
      clientId: "catalog-client-id",
      clientSecret: "catalog-client-secret",
    });
    expect(isParigoSessionConfigured()).toBe(false);
    expect(() => getParigoSessionConfig()).toThrow(/HARVEST_SESSION_SECRET/);
  });
});
