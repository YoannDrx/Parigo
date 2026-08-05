import { describe, expect, it } from "vitest";
import { harvestMainWorkId, isOrphanHarvestVariant } from "./track-works";

describe("Harvest main works", () => {
  it("uses a standalone main track as its own work", () => {
    expect(harvestMainWorkId({ id: "main", isAlternate: false })).toBe("main");
  });

  it("groups versions and stems on MainTrackID", () => {
    expect(harvestMainWorkId({ id: "version", mainTrackId: "main", isAlternate: true })).toBe("main");
    expect(harvestMainWorkId({ id: "stem", mainTrackId: "main", isAlternate: true })).toBe("main");
  });

  it("does not promote an alternate without MainTrackID", () => {
    const track = { id: "orphan", isAlternate: true };
    expect(harvestMainWorkId(track)).toBeUndefined();
    expect(isOrphanHarvestVariant(track)).toBe(true);
  });
});
