import { describe, expect, it } from "vitest";
import {
  ALBUM_EDITORIAL_SEARCH_FIELDS,
  buildCloudSearch,
  harvestCategoryId,
  harvestEditorialKeywordExpression,
  LYRICS_SEARCH_FIELDS,
  mapSearchFacets,
  searchHistoryIdFromResponse,
  splitSignedValues,
  TRACK_EDITORIAL_SEARCH_FIELDS,
} from "./search";

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
    expect(view.Facet_Style).toBe(false);
    expect(bundle.St_Category.IDs).toBe("ATT_51bcfc1bd83261cd");
    expect(harvestCategoryId("ATT_51bcfc1bd83261cd_Piano")).toBe("ATT_51bcfc1bd83261cd");
  });

  it("limits public track searches to a strict title substring", () => {
    const payload = buildCloudSearch({ query: "crime", view: "Track", textScope: "title" });
    const filters = payload.SearchFilters as Record<string, unknown>;
    const bundle = filters.SearchTermBundle as Record<string, Record<string, unknown>>;

    expect(bundle.St_Keyword).toMatchObject({
      Fields: "TrackDisplayTitle",
      ExactPhrase: false,
      Wildcard: true,
      DisableKeywordGroup: true,
      OrOperation: false,
      Keywords: "crime",
    });
    expect(bundle.St_Keyword_Aggregated).toBeUndefined();
  });

  it("uses the album title field without changing aggregate internal searches", () => {
    const titlePayload = buildCloudSearch({ query: "crime", view: "Album", textScope: "title" });
    const aggregatePayload = buildCloudSearch({ query: "crime", view: "Album" });
    const titleBundle = (titlePayload.SearchFilters as Record<string, unknown>).SearchTermBundle as Record<string, Record<string, unknown>>;
    const aggregateBundle = (aggregatePayload.SearchFilters as Record<string, unknown>).SearchTermBundle as Record<string, Record<string, unknown>>;

    expect(titleBundle.St_Keyword.Fields).toBe("AlbumDisplayTitle");
    expect(aggregateBundle.St_Keyword_Aggregated.Keywords).toBe("crime");
  });

  it("uses an explicit editorial allowlist for public track and album searches", () => {
    const trackPayload = buildCloudSearch({ query: "crime", view: "Track", textScope: "editorial" });
    const albumPayload = buildCloudSearch({ query: "crime", view: "Album", textScope: "editorial" });
    const trackKeyword = ((trackPayload.SearchFilters as Record<string, unknown>).SearchTermBundle as Record<string, Record<string, unknown>>).St_Keyword;
    const albumKeyword = ((albumPayload.SearchFilters as Record<string, unknown>).SearchTermBundle as Record<string, Record<string, unknown>>).St_Keyword;

    expect(trackKeyword).toMatchObject({
      Fields: TRACK_EDITORIAL_SEARCH_FIELDS.join(","),
      DisableKeywordGroup: true,
      OrOperation: false,
      Wildcard: true,
    });
    expect(albumKeyword.Fields).toBe(ALBUM_EDITORIAL_SEARCH_FIELDS.join(","));
    for (const forbidden of ["TrackLyrics", "TrackDescription", "TrackCategories", "TrackComposer", "LibraryName"]) {
      expect(trackKeyword.Fields).not.toContain(forbidden);
      expect(albumKeyword.Fields).not.toContain(forbidden);
    }
  });

  it("keeps lyrics in an explicit isolated search scope", () => {
    const payload = buildCloudSearch({ query: "this is the end", view: "Track", textScope: "lyrics" });
    const keyword = ((payload.SearchFilters as Record<string, unknown>).SearchTermBundle as Record<string, Record<string, unknown>>).St_Keyword;

    expect(keyword).toMatchObject({
      Fields: LYRICS_SEARCH_FIELDS.join(","),
      Keywords: "this,is,the,end",
      DisableKeywordGroup: true,
      OrOperation: false,
      Wildcard: true,
    });
    expect(TRACK_EDITORIAL_SEARCH_FIELDS).not.toContain("TrackLyrics");
  });

  it("serializes multiple literal words with Harvest's AND delimiter", () => {
    const payload = buildCloudSearch({ query: "dark  piano", view: "Track", textScope: "editorial" });
    const keyword = ((payload.SearchFilters as Record<string, unknown>).SearchTermBundle as Record<string, Record<string, unknown>>).St_Keyword;

    expect(keyword.Keywords).toBe("dark,piano");
    expect(keyword.OrOperation).toBe(false);
    expect(harvestEditorialKeywordExpression("crime, investigation")).toBe("crime,investigation");
  });

  it("combines a title search with an exact composer term", () => {
    const payload = buildCloudSearch({
      query: "crime",
      view: "Track",
      textScope: "title",
      composerQuery: "Minimatic",
    });
    const filters = payload.SearchFilters as Record<string, unknown>;
    const previous = filters.PreviousSearchTermBundles as Array<Record<string, Record<string, unknown>>>;

    expect(previous).toHaveLength(1);
    expect(previous[0].St_Keyword).toMatchObject({
      Fields: "TrackComposer",
      ExactPhrase: true,
      Wildcard: false,
      Keywords: "Minimatic",
    });
  });

  it("can exclude literal title matches from an editorial result lane", () => {
    const payload = buildCloudSearch({
      query: "crime",
      view: "Track",
      textScope: "editorial",
      excludeTitleQuery: "crime",
    });
    const filters = payload.SearchFilters as Record<string, unknown>;
    const previousBundles = filters.PreviousSearchTermBundles as Array<Record<string, Record<string, unknown>>>;

    expect(previousBundles).toContainEqual({
      St_Keyword: {
        Fields: "TrackDisplayTitle",
        ExactPhrase: false,
        Wildcard: true,
        DisableKeywordGroup: true,
        OrOperation: false,
        Keywords: "crime",
        Negative: true,
      },
    });
  });

  it("can search the global catalogue for raw composer labels by substring", () => {
    const payload = buildCloudSearch({
      query: "%",
      view: "Track",
      composerQuery: "Minimatic",
      composerMatch: "contains",
    });
    const filters = payload.SearchFilters as Record<string, unknown>;
    const previous = filters.PreviousSearchTermBundles as Array<Record<string, Record<string, unknown>>>;

    expect(previous[0].St_Keyword).toMatchObject({
      Fields: "TrackComposer",
      ExactPhrase: false,
      Wildcard: true,
      Keywords: "Minimatic",
    });
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

  it("reads saved search history IDs from both documented response shapes", () => {
    expect(searchHistoryIdFromResponse({ SearchFilters: { parentsearchhistoryid: "history-current" } })).toBe("history-current");
    expect(searchHistoryIdFromResponse({ SearchParameters: { ParentSearchHistoryID: "history-legacy" } })).toBe("history-legacy");
  });

  it("maps nested facet items", () => {
    const facets = mapSearchFacets({
      Facets: {
        BPM: { Min: "1", Max: "312" },
        Duration: { Min: "2", Max: "1200" },
        Libraries: { Items: [{ ID: "a", Name: "Parigo", Count: "42" }] },
        Categories: { Items: [{ ID: "b", ParentID: "root", Name: "Piano", Count: "8" }] },
        Styles: { Items: [{ ID: "style-1", Name: "Cinematic", Count: "12" }] },
      },
    });
    expect(facets.bpm).toEqual({ min: 1, max: 300 });
    expect(facets.labels[0]).toEqual({ id: "a", name: "Parigo", count: 42, parentId: undefined });
    expect(facets.categories[0].parentId).toBe("root");
    expect(facets.styles[0]).toEqual({ id: "style-1", name: "Cinematic", count: 12, parentId: undefined });
  });
});
