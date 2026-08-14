import { describe, expect, it } from "vitest";
import { canonicalSearchFilterLabel, displaySearchFilterName, searchFilterLabel } from "./search-filter-labels";

const translatedItem = {
  id: "ATT_example",
  name: "Triste",
  canonicalName: "Sad",
  localizedName: "Triste",
};

describe("search filter presentation", () => {
  it("keeps the persistent filter value canonical while explaining bilingual suggestions", () => {
    expect(searchFilterLabel("moods", translatedItem, "fr")).toBe("Ambiance · Triste (Sad)");
    expect(searchFilterLabel("moods", translatedItem, "en")).toBe("Mood · Sad");
    expect(displaySearchFilterName("moods", translatedItem, "fr")).toBe("Sad");
    expect(canonicalSearchFilterLabel("moods", translatedItem, "fr")).toBe("Ambiance · Sad");
  });

  it("keeps non-mood filter values canonical", () => {
    expect(displaySearchFilterName("musicFor", {
      ...translatedItem,
      name: "Mariage",
      canonicalName: "Wedding",
      localizedName: "Mariage",
    }, "fr")).toBe("Wedding");
  });
});
