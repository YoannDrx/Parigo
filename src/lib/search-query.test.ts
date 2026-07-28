import { describe, expect, it } from "vitest";
import { normalizeSearchQuery } from "./search-query";

describe("title search query normalization", () => {
  it("normalizes case, accents and whitespace", () => {
    expect(normalizeSearchQuery("  MARIÁGE   ")).toBe("mariage");
  });
});
