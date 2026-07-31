import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requestId } from "@/lib/harvest/api";
import { cloudSearch, getTracksByIds } from "@/lib/harvest/catalog";
import { getSearchFilterGroups } from "@/lib/harvest/search-filters";
import { readHarvestSession } from "@/lib/harvest/session";
import { resolveSearchBrief } from "@/lib/search-intent";
import { translateFrenchSearchQuery } from "@/lib/search-translation";
import type { QueryResolution, SearchIntentResolution } from "@/types";
import { getComposerProfile } from "@/lib/editorial/contracts";

const sortMap = {
  relevance: "RankExpression",
  recent: "ReleaseDate_Desc",
  oldest: "ReleaseDate_Asc",
  title: "Alphabetic_Asc",
  "title-desc": "Alphabetic_Desc",
} as const;

const querySchema = z.object({
  q: z.string().max(500).default("%"),
  brief: z.string().max(500).default(""),
  resolve: z.enum(["0", "1"]).default("0"),
  view: z.enum(["tracks", "albums"]).default("tracks"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  sort: z.enum(["relevance", "recent", "oldest", "title", "title-desc"]).catch("relevance").default("relevance"),
  translate: z.enum(["0", "1"]).default("1"),
  type: z.enum(["main", "alternate", "all"]).default("main"),
  labels: z.string().optional(),
  categories: z.string().optional(),
  composer: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  bpmMin: z.coerce.number().min(1).max(300).optional(),
  bpmMax: z.coerce.number().min(1).max(300).optional(),
  durationMin: z.coerce.number().min(0).optional(),
  durationMax: z.coerce.number().min(1).max(7200).optional(),
  language: z.enum(["fr", "en"]).default("fr"),
});

function list(value?: string): string[] | undefined {
  const values = value?.split(",").map((item) => item.trim()).filter(Boolean);
  return values?.length ? values : undefined;
}

function legacyCategoryValues(request: NextRequest): string[] {
  return ["category", "genre", "mood", "instrument"].flatMap((key) =>
    request.nextUrl.searchParams.getAll(key).flatMap((value) => value.split(",")),
  ).map((value) => value.trim()).filter(Boolean);
}

export async function GET(request: NextRequest) {
  const id = requestId();
  try {
    const rawParams = Object.fromEntries(request.nextUrl.searchParams);
    const input = querySchema.parse({
      ...rawParams,
      q: request.nextUrl.searchParams.get("q") ?? request.nextUrl.searchParams.get("keyword") ?? "%",
    });
    const session = await readHarvestSession();
    const explicitCategories = [...(list(input.categories) || []), ...legacyCategoryValues(request)];
    let intentResolution: SearchIntentResolution | undefined;
    if (input.brief && input.resolve === "1") {
      const [filterGroups, translatedBrief] = await Promise.all([
        getSearchFilterGroups(input.language),
        input.language === "fr" && input.translate !== "0"
          ? translateFrenchSearchQuery(input.brief)
          : Promise.resolve(undefined),
      ]);
      intentResolution = resolveSearchBrief(input.brief, filterGroups, translatedBrief);
    }
    const categories = [
      ...explicitCategories,
      ...(intentResolution?.categoryIds || []),
    ];
    const composerProfile = input.composer ? getComposerProfile(input.composer) : undefined;
    const skip = (input.page - 1) * input.limit;
    const searchInput = {
      query: intentResolution ? "%" : input.q.trim() || "%",
      view: input.view === "albums" ? "Album" : "Track",
      textScope: "title",
      skip,
      limit: input.limit,
      sort: sortMap[input.sort],
      // "Toutes les versions" keeps one main result per musical work. The
      // alternate versions are enriched and nested below it after the search.
      type: input.view === "tracks" && input.type === "all" ? "main" : input.type,
      labels: list(input.labels),
      categories: categories.length ? [...new Set(categories)] : undefined,
      composerQuery: composerProfile?.harvestAliases[0] || composerProfile?.name,
      minBpm: input.bpmMin ?? intentResolution?.bpmRange?.[0],
      maxBpm: input.bpmMax ?? intentResolution?.bpmRange?.[1],
      minDuration: input.durationMin,
      maxDuration: input.durationMax,
      language: input.language,
      saveSearchHistory: Boolean(session),
    } as const;
    const result = intentResolution && !intentResolution.supported
      ? {
          tracks: [],
          albums: [],
          total: 0,
          facets: {
            bpm: { min: 1, max: 300 },
            duration: { min: 1, max: 2029 },
            labels: [],
            categories: [],
            styles: [],
          },
          searchHistoryId: undefined,
        }
      : await cloudSearch(searchInput, session?.memberToken);
    let appliedQueryResolution: QueryResolution | undefined;
    let appliedResult = result;
    if (!intentResolution && result.total === 0 && input.q !== "%" && input.translate !== "0") {
      const queryResolution = await translateFrenchSearchQuery(input.q);
      if (queryResolution) {
        appliedResult = await cloudSearch({
          ...searchInput,
          query: queryResolution.effective,
          saveSearchHistory: Boolean(session),
        }, session?.memberToken);
        if (appliedResult.total > 0) appliedQueryResolution = queryResolution;
      }
    }
    if (input.view === "tracks" && input.type === "all" && appliedResult.tracks.length) {
      const enrichedTracks = await getTracksByIds(
        appliedResult.tracks.map((track) => track.id),
        session?.memberToken,
        undefined,
        "search-versions",
      );
      const enrichedById = new Map(enrichedTracks.map((track) => [track.id, track]));
      appliedResult = {
        ...appliedResult,
        tracks: appliedResult.tracks.map((track) => ({
          ...track,
          ...(enrichedById.get(track.id) ?? {}),
        })),
      };
    }
    const items = input.view === "albums" ? appliedResult.albums : appliedResult.tracks;
    const publicFacets = {
      bpm: appliedResult.facets.bpm,
      duration: appliedResult.facets.duration,
      labels: appliedResult.facets.labels,
      categories: appliedResult.facets.categories,
    };
    return NextResponse.json({
      data: {
        items,
        view: input.view,
        facets: publicFacets,
        appliedSearch: { ...input, q: input.q === "%" ? "" : input.q },
      },
      meta: {
        page: input.page,
        pageSize: input.limit,
        total: appliedResult.total,
        searchHistoryId: appliedResult.searchHistoryId,
        ...(intentResolution ? { intentResolution } : {}),
        ...(appliedQueryResolution ? { queryResolution: appliedQueryResolution } : {}),
        requestId: id,
      },
    }, {
      headers: {
        "Cache-Control": session ? "no-store" : "public, s-maxage=30, stale-while-revalidate=120",
        "X-Request-ID": id,
      },
    });
  } catch (error) {
    return apiError(error, id);
  }
}
