import { describe, expect, it } from "vitest";
import { assertNoHarvestError, HarvestError } from "./errors";

describe("Harvest logical errors", () => {
  it("accepts Error code zero", () => {
    expect(() => assertNoHarvestError({ Error: { Code: "0", Description: "" } })).not.toThrow();
  });

  it("rejects errors returned with an HTTP-success payload", () => {
    expect(() => assertNoHarvestError({ Error: { Code: "3", Description: "Feature not enabled" } }))
      .toThrowError(HarvestError);
    try {
      assertNoHarvestError({ Error: { Code: "3", Description: "Feature not enabled" } });
    } catch (error) {
      expect(error).toMatchObject({
        code: "FORBIDDEN",
        status: 403,
        retryable: false,
        upstreamCode: "3",
      });
    }
  });

  it("recognizes lowercase error envelopes and preserves the Harvest code", () => {
    expect(() => assertNoHarvestError({ error: { Code: 4, Description: "Internal operation error" } }))
      .toThrowError(HarvestError);
    try {
      assertNoHarvestError({ error: { Code: 4, Description: "Internal operation error" } });
    } catch (error) {
      expect(error).toMatchObject({
        code: "HARVEST_UNAVAILABLE",
        status: 502,
        retryable: false,
        upstreamCode: "4",
      });
    }
  });
});
