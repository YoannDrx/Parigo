import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requestId } from "@/lib/harvest/api";
import { getTracksByIds } from "@/lib/harvest/catalog";
import {
  findStaleIndexedComposerQuery,
  refreshInvalidComposerTracks,
} from "@/lib/harvest/composer-search";
import { configuredSearchFieldProfile } from "@/lib/harvest/search";
import { readHarvestSession } from "@/lib/harvest/session";
import { logEvent } from "@/lib/logger";
import { isCatalogIdentifier, stripLegacySearchQuotes } from "@/lib/search-query";
import { translateFrenchSearchQuery } from "@/lib/search-translation";
import {
  getSearchCapabilities,
  harvestKeywordProvider,
} from "@/lib/search/providers";
import type { QueryResolution, SearchTranslationMode } from "@/types";

const sortMap = {
  relevance: "RankExpression",
  recent: "ReleaseDate_Desc",
  oldest: "ReleaseDate_Asc",
  title: "Alphabetic_Asc",
  "title-desc": "Alphabetic_Desc",
} as const;

const querySchema = z.object({
  q: z.string().max(500).default("%"),
  mode: z.enum(["keyword", "ai"]).default("keyword"),
  translation: z.enum(["offer", "apply", "off"]).default("offer"),
  view: z.enum(["tracks", "albums"]).default("tracks"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  sort: z.enum(["relevance", "recent", "oldest", "title", "title-desc"]).catch("relevance").default("relevance"),
  type: z.enum(["main", "alternate", "all"]).default("main"),
  labels: z.string().optional(),
  styles: z.string().optional(),
  categories: z.string().optional(),
  composer: z.string().trim().min(1).max(200).optional(),
  bpmMin: z.coerce.number().min(1).max(300).optional(),
  bpmMax: z.coerce.number().min(1).max(300).optional(),
  durationMin: z.coerce.number().min(0).optional(),
  durationMax: z.coerce.number().min(1).max(7200).optional(),
  language: z.enum(["fr", "en"]).default("fr"),
  probe: z.enum(["0", "1"]).default("0").transform((value) => value === "1"),
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

function canonicalQuery(request: NextRequest): string {
  const value = request.nextUrl.searchParams.get("q")
    ?? request.nextUrl.searchParams.get("keyword")
    ?? request.nextUrl.searchParams.get("brief")
    ?? "%";
  return value === "%" ? value : stripLegacySearchQuotes(value);
}

function translationMode(request: NextRequest): SearchTranslationMode {
  const current = request.nextUrl.searchParams.get("translation");
  if (current === "offer" || current === "apply" || current === "off") return current;
  const legacy = request.nextUrl.searchParams.get("translate");
  if (legacy === "1") return "apply";
  if (legacy === "0") return "off";
  return "offer";
}

export async function GET(request: NextRequest) {
  const id = requestId();
  const startedAt = Date.now();
  try {
    const rawParams = Object.fromEntries(request.nextUrl.searchParams);
    const input = querySchema.parse({
      ...rawParams,
      q: canonicalQuery(request),
      translation: translationMode(request),
    });
    const capabilities = getSearchCapabilities();
    if (input.mode === "ai") {
      return NextResponse.json({
        error: {
          code: "FEATURE_UNAVAILABLE",
          message: "AIMS prompt search is not available yet",
          retryable: false,
          requestId: id,
        },
        meta: { capabilities, requestId: id },
      }, { status: 503, headers: { "Cache-Control": "no-store", "X-Request-ID": id } });
    }

    const session = await readHarvestSession();
    const categories = [
      ...(list(input.categories) || []),
      ...legacyCategoryValues(request),
    ];
    // Harvest exposes catalogue references through its title index even though
    // those codes are not part of the public display title. Keep this narrow
    // compatibility path separate from the editorial keyword allowlist.
    const fieldProfile = isCatalogIdentifier(input.q)
      ? "title"
      : configuredSearchFieldProfile();
    const skip = (input.page - 1) * input.limit;
    const saveSearchHistory = Boolean(session) && !input.probe;
    const searchInput = {
      query: input.q.trim() || "%",
      view: input.view === "albums" ? "Album" : "Track",
      textScope: fieldProfile,
      skip,
      limit: input.limit,
      sort: sortMap[input.sort],
      // "Toutes les versions" keeps one main result per musical work. The
      // alternate versions are enriched and nested below it after the search.
      type: input.view === "tracks" && input.type === "all" ? "main" : input.type,
      labels: list(input.labels),
      styles: list(input.styles),
      categories: categories.length ? [...new Set(categories)] : undefined,
      composerQuery: input.composer,
      minBpm: input.bpmMin,
      maxBpm: input.bpmMax,
      minDuration: input.durationMin,
      maxDuration: input.durationMax,
      language: input.language,
      saveSearchHistory,
      includeStyleFacets: true,
    } as const;
    const result = await harvestKeywordProvider.search(searchInput, session?.memberToken);
    let translationSuggestion: QueryResolution | undefined;
    let appliedQueryResolution: QueryResolution | undefined;
    let appliedResult = result;

    if (result.total === 0 && input.q !== "%" && input.translation !== "off") {
      const resolution = await translateFrenchSearchQuery(input.q);
      if (resolution && input.translation === "offer") {
        translationSuggestion = resolution;
      } else if (resolution && input.translation === "apply") {
        appliedQueryResolution = resolution;
        appliedResult = await harvestKeywordProvider.search({
          ...searchInput,
          query: resolution.effective,
          saveSearchHistory,
        }, session?.memberToken);
      }
    }

    if (appliedResult.total === 0 && input.view === "tracks" && input.composer) {
      const staleComposerQuery = await findStaleIndexedComposerQuery(input.composer, session?.memberToken);
      if (staleComposerQuery && staleComposerQuery !== input.composer) {
        appliedResult = await harvestKeywordProvider.search({
          ...searchInput,
          composerQuery: staleComposerQuery,
          saveSearchHistory,
        }, session?.memberToken);
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
    if (input.view === "tracks" && appliedResult.tracks.length) {
      appliedResult = {
        ...appliedResult,
        tracks: await refreshInvalidComposerTracks(
          appliedResult.tracks,
          session?.memberToken,
          "search-composer-refresh",
        ),
      };
    }
    const items = input.view === "albums" ? appliedResult.albums : appliedResult.tracks;
    const providerDurationMs = Date.now() - startedAt;
    logEvent({
      level: "info",
      message: "catalog_search",
      route: "search",
      durationMs: providerDurationMs,
      requestId: id,
      searchMode: input.mode,
      provider: harvestKeywordProvider.id,
      fieldProfile,
      total: appliedResult.total,
      translationOffered: Boolean(translationSuggestion),
      translationApplied: Boolean(appliedQueryResolution),
    });
    return NextResponse.json({
      data: {
        items,
        view: input.view,
        facets: appliedResult.facets,
        appliedSearch: { ...input, q: input.q === "%" ? "" : input.q },
      },
      meta: {
        page: input.page,
        pageSize: input.limit,
        total: appliedResult.total,
        searchHistoryId: appliedResult.searchHistoryId,
        searchMode: input.mode,
        fieldProfile,
        provider: harvestKeywordProvider.id,
        providerDurationMs,
        capabilities,
        ...(translationSuggestion ? { translationSuggestion } : {}),
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
