import { describe, expect, it } from "vitest";
import { canonicalSearchFilterLabel, displaySearchFilterName, searchFilterLabel } from "./search-filter-labels";

const translatedItem = {
  id: "ATT_example",
  name: "Triste",
  canonicalName: "Sad",
  localizedName: "Triste",
};

describe("search filter presentation", () => {
  it("presents the localized value in French while preserving the canonical diagnostic", () => {
    expect(searchFilterLabel("moods", translatedItem, "fr")).toBe("Ambiance · Triste (Sad)");
    expect(searchFilterLabel("moods", translatedItem, "en")).toBe("Mood · Sad");
    expect(displaySearchFilterName("moods", translatedItem, "fr")).toBe("Triste");
    expect(displaySearchFilterName("moods", translatedItem, "en")).toBe("Sad");
    expect(canonicalSearchFilterLabel("moods", translatedItem, "fr")).toBe("Ambiance · Triste");
  });

  it("localizes non-mood filter values too", () => {
    expect(displaySearchFilterName("musicFor", {
      ...translatedItem,
      name: "Mariage",
      canonicalName: "Wedding",
      localizedName: "Mariage",
    }, "fr")).toBe("Mariage");
  });
});
