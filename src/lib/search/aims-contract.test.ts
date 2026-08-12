import { describe, expect, it } from "vitest";
import {
  AIMS_FILTER_FIELD_MAP,
  normalizeAimsClientId,
  preserveAimsRankAfterHydration,
} from "./aims-contract";

describe("inactive AIMS provider contract", () => {
  it("normalizes client IDs and preserves AIMS relevance after Harvest hydration", () => {
    const result = preserveAimsRankAfterHydration(
      [{ idClient: "track-3" }, { idClient: "track-1" }, { idClient: "missing" }],
      [{ id: "track-1", title: "First" }, { id: "track-3", title: "Third" }],
    );

    expect(result.items.map((item) => item.id)).toEqual(["track-3", "track-1"]);
    expect(result.missingIds).toEqual(["missing"]);
    expect(normalizeAimsClientId(" 42 ")).toBe("42");
  });

  it("keeps unsupported filters explicit instead of guessing a mapping", () => {
    expect(AIMS_FILTER_FIELD_MAP.genre).toBe("genres");
    expect(AIMS_FILTER_FIELD_MAP.composer).toBeNull();
    expect(AIMS_FILTER_FIELD_MAP.period).toBeNull();
  });
});
