import { describe, expect, it } from "vitest";
import type { SearchFilterGroup } from "@/types";
import { resolveTaxonomySuggestions } from "./search-taxonomy";

const groups: SearchFilterGroup[] = [
  {
    key: "genre",
    label: "Genre",
    selection: "include-exclude",
    total: 1,
    available: 1,
    items: [{ id: "ATT_reggae-genre", name: "Reggae", canonicalName: "Reggae", localizedName: "Reggae" }],
  },
  {
    key: "styles",
    label: "Style",
    selection: "include-exclude",
    total: 1,
    available: 1,
    items: [{ id: "STYLE_reggae", name: "Reggae", canonicalName: "Reggae", localizedName: "Reggae" }],
  },
  {
    key: "moods",
    label: "Ambiance",
    selection: "include-exclude",
    total: 1,
    available: 1,
    items: [{
      id: "ATT_b71182fbd44d6ef6",
      name: "Triste",
      canonicalName: "Sad",
      localizedName: "Triste",
      path: ["Ambiance", "Triste"],
    }],
  },
];

describe("Harvest taxonomy resolution", () => {
  it.each(["sad", "triste", "TRÍSTE"])("joins canonical and localized names for %s", (query) => {
    const result = resolveTaxonomySuggestions(query, groups);
    expect(result).toContainEqual(expect.objectContaining({
      id: "ATT_b71182fbd44d6ef6",
      filterGroup: "moods",
      label: "Ambiance · Triste (Sad)",
    }));
  });

  it("keeps homonymous and multi-term filters separate", () => {
    const result = resolveTaxonomySuggestions("reggae triste", groups);
    expect(result.map((item) => [item.filterGroup, item.id])).toEqual([
      ["genre", "ATT_reggae-genre"],
      ["styles", "STYLE_reggae"],
      ["moods", "ATT_b71182fbd44d6ef6"],
    ]);
  });

  it("does not return partial or stemmed matches", () => {
    expect(resolveTaxonomySuggestions("sadness", groups)).toEqual([]);
    expect(resolveTaxonomySuggestions("reggaeton", groups)).toEqual([]);
  });
});
