import { describe, expect, it, vi } from "vitest";
import type { SearchFacets, Track } from "@/types";
import type { HarvestSearchInput } from "./search";
import { mergeDisjointSearchFacets, searchWithTitlePriority, type HarvestSearchResult } from "./title-priority-search";

const emptyFacets = (): SearchFacets => ({
  bpm: { min: 1, max: 300 },
  duration: { min: 1, max: 2029 },
  labels: [],
  categories: [],
  styles: [],
});

const track = (id: string, title = id): Track => ({
  id,
  title,
  slug: id,
  duration: 1,
  bpm: null,
  key: null,
  audioUrl: null,
  albumId: "album",
  albumTitle: "Album",
  genres: [],
  moods: [],
  instruments: [],
  isVocal: null,
  waveform: null,
  artists: [],
  composers: [],
  authors: [],
  rightHolderIds: [],
  publishers: [],
  isAlternate: false,
  variantKind: "main",
  alternateCount: 0,
  stemCount: 0,
});

function result(ids: string[], total = ids.length): HarvestSearchResult {
  return { tracks: ids.map((id) => track(id)), albums: [], total, facets: emptyFacets() };
}

describe("title-priority Harvest search", () => {
  it("runs page-one lanes in parallel and places every title item first", async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const execute = vi.fn(async (input: HarvestSearchInput) => {
      await gate;
      return input.textScope === "title"
        ? { ...result([], 2), tracks: [track("title-1", "Crime One"), track("title-2", "Crime Two")] }
        : result(["editorial-1", "editorial-2"], 8);
    });
    const pending = searchWithTitlePriority({ query: "crime", view: "Track", textScope: "editorial", limit: 3 }, execute);

    expect(execute).toHaveBeenCalledTimes(2);
    release?.();
    const searched = await pending;

    expect(searched.tracks.map((item) => item.id)).toEqual(["title-1", "title-2", "editorial-1"]);
    expect(searched.total).toBe(10);
    expect(execute.mock.calls[1]?.[0]).toMatchObject({
      textScope: "editorial",
      excludeTitleQuery: "crime",
      skip: 0,
    });
  });

  it("drops unverifiable Harvest title candidates before composing the page", async () => {
    const execute = vi.fn(async (input: HarvestSearchInput) => input.textScope === "title"
      ? { ...result([], 2), tracks: [track("valid", "Crime Scene"), track("false-positive", "Unrelated")] }
      : result(["editorial-1", "editorial-2"], 8));

    const searched = await searchWithTitlePriority({ query: "crime", view: "Track", textScope: "editorial", limit: 2 }, execute);

    expect(searched.tracks.map((item) => item.id)).toEqual(["valid", "editorial-1"]);
    expect(searched.titleTracks.map((item) => item.id)).toEqual(["valid"]);
    expect(searched.editorialTracks[0]?.id).toBe("editorial-1");
  });

  it("offsets the disjoint editorial lane after the title lane", async () => {
    const titleLane = {
      ...result([], 45),
      tracks: Array.from({ length: 45 }, (_, index) => track(`title-${index}`, `Crime ${index}`)),
    };
    const execute = vi.fn(async (input: HarvestSearchInput) => input.textScope === "title"
      ? titleLane
      : result(["editorial-16"], 100));

    const searched = await searchWithTitlePriority({
      query: "crime",
      view: "Track",
      textScope: "editorial",
      skip: 60,
      limit: 30,
    }, execute);

    expect(searched.tracks.map((item) => item.id)).toEqual(["editorial-16"]);
    expect(execute).toHaveBeenCalledTimes(3);
    expect(execute.mock.calls[2]?.[0].skip).toBe(15);
  });

  it("adds facet counts from the two disjoint result sets", () => {
    const titleLane = result(["title"], 1);
    titleLane.facets.categories = [{ id: "crime", name: "Crime", count: 1 }];
    titleLane.facets.labels = [{ id: "parigo", name: "Parigo", count: 1 }];
    const editorialLane = result(["editorial"], 9);
    editorialLane.facets.categories = [{ id: "crime", name: "Crime", count: 4 }];
    editorialLane.facets.labels = [{ id: "parigo", name: "Parigo", count: 7 }];

    const facets = mergeDisjointSearchFacets([titleLane, editorialLane]);

    expect(facets.categories).toEqual([{ id: "crime", name: "Crime", count: 5 }]);
    expect(facets.labels).toEqual([{ id: "parigo", name: "Parigo", count: 8 }]);
  });
});
