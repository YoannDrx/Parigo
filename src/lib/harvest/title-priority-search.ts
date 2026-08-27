import type { Album, SearchFacetItem, SearchFacets, Track } from "@/types";
import { containsNormalizedExpression, searchTerms } from "@/lib/search-normalization";
import { albumSearchEvidence, explainsSearchQuery, trackSearchEvidence } from "@/lib/search-match-evidence";
import type { HarvestSearchInput } from "./search";

export interface HarvestSearchResult {
  tracks: Track[];
  albums: Album[];
  total: number;
  facets: SearchFacets;
  searchHistoryId?: string;
}

export interface TitlePrioritySearchResult extends HarvestSearchResult {
  titleTracks: Track[];
  titleAlbums: Album[];
  editorialTracks: Track[];
  editorialAlbums: Album[];
  titleTotal: number;
  editorialTotal: number;
}

export type HarvestSearchExecutor = (input: HarvestSearchInput) => Promise<HarvestSearchResult>;

export function isTitlePrioritySearchResult(
  result: HarvestSearchResult,
): result is TitlePrioritySearchResult {
  return "titleTotal" in result && typeof result.titleTotal === "number";
}

function mergeFacetItems(lanes: HarvestSearchResult[]): SearchFacetItem[] {
  const byId = new Map<string, SearchFacetItem>();
  for (const lane of lanes) {
    for (const item of lane.facets.categories) {
      const current = byId.get(item.id);
      byId.set(item.id, current ? { ...current, count: current.count + item.count } : item);
    }
  }
  return [...byId.values()];
}

function mergeNamedFacetItems(
  lanes: HarvestSearchResult[],
  field: "labels" | "styles",
): SearchFacetItem[] {
  const byId = new Map<string, SearchFacetItem>();
  for (const lane of lanes) {
    for (const item of lane.facets[field]) {
      const current = byId.get(item.id);
      byId.set(item.id, current ? { ...current, count: current.count + item.count } : item);
    }
  }
  return [...byId.values()];
}

export function mergeDisjointSearchFacets(lanes: HarvestSearchResult[]): SearchFacets {
  const populated = lanes.filter((lane) => lane.total > 0);
  if (!populated.length) return lanes[0]?.facets ?? {
    bpm: { min: 1, max: 300 },
    duration: { min: 1, max: 2029 },
    labels: [],
    categories: [],
    styles: [],
  };
  return {
    bpm: {
      min: Math.min(...populated.map((lane) => lane.facets.bpm.min)),
      max: Math.max(...populated.map((lane) => lane.facets.bpm.max)),
    },
    duration: {
      min: Math.min(...populated.map((lane) => lane.facets.duration.min)),
      max: Math.max(...populated.map((lane) => lane.facets.duration.max)),
    },
    labels: mergeNamedFacetItems(populated, "labels"),
    categories: mergeFacetItems(populated),
    styles: mergeNamedFacetItems(populated, "styles"),
  };
}

function entities(result: HarvestSearchResult, view: "Track" | "Album"): Array<Track | Album> {
  return view === "Album" ? result.albums : result.tracks;
}

function verifiedTitleEntities(
  result: HarvestSearchResult,
  view: "Track" | "Album",
  query: string,
): Array<Track | Album> {
  const terms = searchTerms(query);
  return entities(result, view).filter((item) => (
    terms.length > 0 && terms.every((term) => containsNormalizedExpression(item.title, term))
  ));
}

function splitTitleCandidates(
  result: HarvestSearchResult,
  view: "Track" | "Album",
  query: string,
): { verified: Array<Track | Album>; unverified: Array<Track | Album> } {
  const candidates = entities(result, view);
  const verifiedIds = new Set(verifiedTitleEntities(result, view, query).map((item) => item.id));
  return {
    verified: candidates.filter((item) => verifiedIds.has(item.id)),
    unverified: candidates.filter((item) => {
      if (verifiedIds.has(item.id)) return false;
      const evidence = view === "Album"
        ? albumSearchEvidence(item as Album, query)
        : trackSearchEvidence(item as Track, query);
      return explainsSearchQuery(evidence, query);
    }),
  };
}

/**
 * Builds one deterministic result stream from two disjoint Harvest queries:
 * literal title matches first, then editorial matches whose title does not
 * match. Page one is fetched in parallel so the two lanes cost one upstream
 * round-trip in wall-clock time.
 */
export async function searchWithTitlePriority(
  input: HarvestSearchInput,
  execute: HarvestSearchExecutor,
): Promise<TitlePrioritySearchResult> {
  const view = input.view ?? "Track";
  const query = input.query?.trim() || "%";
  const skip = Math.max(0, input.skip ?? 0);
  const limit = Math.max(1, input.limit ?? 30);
  const titleInput = (titleSkip: number, titleLimit: number): HarvestSearchInput => ({
    ...input,
    query,
    textScope: "title",
    skip: titleSkip,
    limit: titleLimit,
    saveSearchHistory: false,
    excludeTitleQuery: undefined,
  });
  const aggregateInput = (aggregateSkip: number): HarvestSearchInput => ({
    ...input,
    query,
    textScope: "aggregate",
    skip: aggregateSkip,
    limit,
    excludeTitleQuery: query,
  });

  const titleBatchSize = 100;
  const [titleSummary, aggregateAtStart] = await Promise.all([
    execute(titleInput(0, titleBatchSize)),
    execute(aggregateInput(0)),
  ]);
  const firstCandidates = splitTitleCandidates(titleSummary, view, query);
  const verifiedCandidates = [...firstCandidates.verified];
  const unverifiedCandidates = [...firstCandidates.unverified];
  let rawOffset = titleBatchSize;
  while (verifiedCandidates.length < skip + limit && rawOffset < titleSummary.total) {
    const batch = await execute(titleInput(rawOffset, titleBatchSize));
    const candidates = splitTitleCandidates(batch, view, query);
    verifiedCandidates.push(...candidates.verified);
    unverifiedCandidates.push(...candidates.unverified);
    rawOffset += titleBatchSize;
  }

  const exhaustedTitleCandidates = rawOffset >= titleSummary.total;
  // Harvest's title wildcard is a candidate index, not a strict contains
  // operator. Once its candidate set is exhausted, unverifiable candidates
  // remain searchable as editorial matches, after every verified title.
  const orderedTitleLane = exhaustedTitleCandidates
    ? [...verifiedCandidates, ...unverifiedCandidates]
    : verifiedCandidates;
  const titleEntities = orderedTitleLane.slice(skip, skip + limit);
  const editorialSkip = exhaustedTitleCandidates
    ? Math.max(0, skip - orderedTitleLane.length)
    : 0;
  const aggregateResult = editorialSkip === 0
    ? aggregateAtStart
    : await execute(aggregateInput(editorialSkip));
  const aggregateEntities = entities(aggregateResult, view);
  const pageEntities = [...titleEntities, ...aggregateEntities].slice(0, limit);
  const verifiedIds = new Set(verifiedCandidates.map((item) => item.id));
  const verifiedPageTitles = titleEntities.filter((item) => verifiedIds.has(item.id));
  const unverifiedPageTitles = titleEntities.filter((item) => !verifiedIds.has(item.id));
  const titleTracks = view === "Track" ? verifiedPageTitles as Track[] : [];
  const titleAlbums = view === "Album" ? verifiedPageTitles as Album[] : [];
  const editorialTracks = view === "Track" ? [...unverifiedPageTitles, ...aggregateResult.tracks] as Track[] : [];
  const editorialAlbums = view === "Album" ? [...unverifiedPageTitles, ...aggregateResult.albums] as Album[] : [];

  return {
    tracks: view === "Track" ? pageEntities as Track[] : [],
    albums: view === "Album" ? pageEntities as Album[] : [],
    total: titleSummary.total + aggregateResult.total,
    facets: mergeDisjointSearchFacets([titleSummary, aggregateResult]),
    searchHistoryId: aggregateResult.searchHistoryId ?? titleSummary.searchHistoryId,
    titleTracks,
    titleAlbums,
    editorialTracks,
    editorialAlbums,
    // This count contains only title candidates that were verified locally in
    // the portion scanned for the requested page. Unlike Harvest's raw title
    // candidate total, it never counts an unrelated wildcard candidate.
    titleTotal: verifiedCandidates.length,
    editorialTotal: aggregateResult.total,
  };
}
