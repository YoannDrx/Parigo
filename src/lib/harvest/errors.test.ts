import { describe, expect, it } from "vitest";
import { assertNoHarvestError, HarvestError } from "./errors";

describe("Harvest logical errors", () => {
  it("accepts Error code zero", () => {
    expect(() => assertNoHarvestError({ Error: { Code: "0", Description: "" } })).not.toThrow();
  });

  it("rejects errors returned with an HTTP-success payload", () => {
    expect(() => assertNoHarvestError({ Error: { Code: "3", Description: "Expired" } }))
      .toThrowError(HarvestError);
  });
});
