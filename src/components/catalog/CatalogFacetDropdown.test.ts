import { describe, expect, it } from "vitest";
import { catalogFacetState, updateCatalogFacet } from "./CatalogFacetDropdown";

describe("catalog facet selection", () => {
  it("distinguishes neutral, included and excluded values", () => {
    expect(catalogFacetState([], "Calm")).toBe("neutral");
    expect(catalogFacetState(["Calm"], "Calm")).toBe("include");
    expect(catalogFacetState(["-Calm"], "Calm")).toBe("exclude");
  });

  it("replaces the opposite state instead of duplicating a filter", () => {
    expect(updateCatalogFacet(["Calm"], "Calm", "exclude")).toEqual(["-Calm"]);
    expect(updateCatalogFacet(["-Calm"], "Calm", "include")).toEqual(["Calm"]);
  });

  it("toggles an already selected state back to neutral", () => {
    expect(updateCatalogFacet(["Calm", "Jazz"], "Calm", "include")).toEqual(["Jazz"]);
    expect(updateCatalogFacet(["-Calm", "Jazz"], "Calm", "exclude")).toEqual(["Jazz"]);
  });
});
