import { describe, expect, it } from "vitest";
import { buildCloudSearch, harvestCategoryId, mapSearchFacets, splitSignedValues } from "./search";

describe("Harvest Cloud Search", () => {
  it("serializes supported filters and clamps BPM", () => {
    const payload = buildCloudSearch({
      query: "piano",
      labels: ["label-1"],
      styles: ["style-1"],
      categories: ["category-1"],
      minBpm: 70,
      maxBpm: 8590,
      skip: 30,
      limit: 30,
    });
    const filters = payload.SearchFilters as Record<string, unknown>;
    const bundle = filters.SearchTermBundle as Record<string, Record<string, unknown>>;
    expect(bundle.St_Keyword_Aggregated.Keywords).toBe("piano");
    expect(bundle.St_Library.Libraries).toBe("label-1");
    expect(bundle.St_Style.Styles).toBe("style-1");
    expect(bundle.St_Bpm).toEqual({ Start: "70", End: "300" });
    expect((filters.ResultView as Record<string, unknown>).Skip).toBe("30");
  });

  it("matches the production relevance and category contract", () => {
    const payload = buildCloudSearch({
      query: "piano",
      categories: ["51bcfc1bd83261cd"],
      language: "fr",
      regionId: "e361bcb57f53f791",
      saveSearchHistory: true,
      returnRates: true,
    });
    const filters = payload.SearchFilters as Record<string, unknown>;
    const view = filters.ResultView as Record<string, unknown>;
    const bundle = filters.SearchTermBundle as Record<string, Record<string, unknown>>;
    expect(payload.SaveSearchHistory).toBe(true);
    expect(filters.TranslateKeyword).toBe("fr");
    expect(view.Sort_Predefined).toBe("RankExpression");
    expect(view.ReturnRates).toBe(true);
    expect(bundle.St_Category.IDs).toBe("ATT_51bcfc1bd83261cd");
    expect(harvestCategoryId("ATT_51bcfc1bd83261cd_Piano")).toBe("ATT_51bcfc1bd83261cd");
  });

  it("serializes included and excluded filters exactly once", () => {
    const payload = buildCloudSearch({
      categories: ["-ATT_df36fdca961e0855_Ambient", "51bcfc1bd83261cd", "51bcfc1bd83261cd"],
      styles: ["style-b", "-style-a"],
      labels: ["label-b", "label-a", "-ignored-label"],
    });
    const filters = payload.SearchFilters as Record<string, unknown>;
    const current = filters.SearchTermBundle as Record<string, Record<string, unknown>>;
    const previous = (filters.PreviousSearchTermBundles as Array<Record<string, Record<string, unknown>>>)[0];
    expect(current.St_Category.IDs).toBe("ATT_51bcfc1bd83261cd");
    expect(current.St_Style.Styles).toBe("style-b");
    expect(current.St_Library.Libraries).toBe("label-a,label-b");
    expect(previous.St_Category).toEqual({ IDs: "ATT_df36fdca961e0855", Negative: true });
    expect(previous.St_Style).toEqual({ Styles: "style-a", OrOperation: false, Negative: true });
  });

  it("normalizes signed values deterministically", () => {
    expect(splitSignedValues(["b", "-c", "a", "b"])).toEqual({ include: ["a", "b"], exclude: ["c"] });
  });

  it("maps nested facet items", () => {
    const facets = mapSearchFacets({
      Facets: {
        BPM: { Min: "1", Max: "312" },
        Duration: { Min: "2", Max: "1200" },
        Libraries: { Items: [{ ID: "a", Name: "Parigo", Count: "42" }] },
        Categories: { Items: [{ ID: "b", ParentID: "root", Name: "Piano", Count: "8" }] },
      },
    });
    expect(facets.bpm).toEqual({ min: 1, max: 300 });
    expect(facets.labels[0]).toEqual({ id: "a", name: "Parigo", count: 42, parentId: undefined });
    expect(facets.categories[0].parentId).toBe("root");
  });
});
