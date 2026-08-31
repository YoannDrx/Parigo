import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requestId } from "@/lib/harvest/api";
import { buildAutocompletePayload, mapAutocompleteResponse } from "@/lib/harvest/autocomplete";
import { getTracksByIds } from "@/lib/harvest/catalog";
import { guestRequest } from "@/lib/harvest/client";
import {
  findStaleIndexedComposerQuery,
  refreshInvalidComposerTracks,
} from "@/lib/harvest/composer-search";
import { configuredSearchFieldProfile, type HarvestSearchInput } from "@/lib/harvest/search";
import { getSearchFilterGroups } from "@/lib/harvest/search-filters";
import { readHarvestSession } from "@/lib/harvest/session";
import { isTitlePrioritySearchResult, searchWithTitlePriority } from "@/lib/harvest/title-priority-search";
import { logEvent } from "@/lib/logger";
import { isCatalogIdentifier, stripLegacySearchQuotes } from "@/lib/search-query";
import { translateFrenchSearchQuery } from "@/lib/search-translation";
import { albumSearchEvidence, explainsSearchQuery, prioritizeAlbumSearchEvidence, prioritizeTitleEvidence, trackSearchEvidence } from "@/lib/search-match-evidence";
import { normalizeSearchText, searchExpressionsCoverQuery } from "@/lib/search-normalization";
import { resolveTaxonomySuggestions } from "@/lib/search-taxonomy";
import {
  getSearchCapabilities,
  harvestKeywordProvider,
} from "@/lib/search/providers";
import type { Album, QueryResolution, SearchTranslationMode, Track } from "@/types";

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
          message: "La recherche par similarité n’est pas disponible sur cette route.",
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
    // Catalogue references live in Harvest's aggregate index rather than in
    // the public display title returned to Parigo.
    const fieldProfile = configuredSearchFieldProfile();
    const skip = (input.page - 1) * input.limit;
    const saveSearchHistory = Boolean(session) && !input.probe;
    const searchInput: HarvestSearchInput = {
      query: input.q.trim() || "%",
      view: input.view === "albums" ? "Album" : "Track",
      textScope: isCatalogIdentifier(input.q) || fieldProfile === "aggregate-title-first" ? "aggregate" : fieldProfile,
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
    };
    let titleSearchMs = 0;
    let aggregateSearchMs = 0;
    const executeSearch = async (candidate: HarvestSearchInput) => {
      const searchStartedAt = Date.now();
      const response = await harvestKeywordProvider.search(candidate, session?.memberToken);
      const duration = Date.now() - searchStartedAt;
      if (candidate.textScope === "title") titleSearchMs += duration;
      else aggregateSearchMs += duration;
      return response;
    };
    const runSearch = (candidate: HarvestSearchInput) => (
      candidate.textScope === "aggregate"
      && candidate.query !== "%"
      && candidate.sort === "RankExpression"
        ? searchWithTitlePriority(candidate, executeSearch)
        : executeSearch(candidate)
    );
    const result = await runSearch(searchInput);
    let translationSuggestion: QueryResolution | undefined;
    let appliedQueryResolution: QueryResolution | undefined;
    let appliedResult = result;

    const fallbackResolution = result.total === 0 && input.q !== "%" && input.translation !== "off"
      ? await Promise.all([
        getSearchFilterGroups(input.language),
        guestRequest<Record<string, unknown>>(
          (token) => `/autocomplete/${token}`,
          { method: "POST", body: JSON.stringify(buildAutocompletePayload(input.q)) },
        ),
      ]).then(([groups, autocompletePayload]) => {
        const taxonomy = resolveTaxonomySuggestions(input.q, groups);
        return {
          taxonomyFullyExplainsQuery: searchExpressionsCoverQuery(input.q, taxonomy.map((item) => item.matchedTerm)),
          hasExactEntity: mapAutocompleteResponse(autocompletePayload, input.view, undefined, undefined, input.q)
            .flatMap((group) => group.key === "words" ? [] : group.items)
            .some((item) => normalizeSearchText(item.label) === normalizeSearchText(input.q)),
        };
      }).catch(() => undefined)
      : { taxonomyFullyExplainsQuery: false, hasExactEntity: false };
    if (
      result.total === 0
      && input.q !== "%"
      && input.translation !== "off"
      && fallbackResolution?.taxonomyFullyExplainsQuery === false
      && fallbackResolution.hasExactEntity === false
    ) {
      const resolution = await translateFrenchSearchQuery(input.q);
      if (resolution && input.translation === "offer") {
        translationSuggestion = resolution;
      } else if (resolution && input.translation === "apply") {
        appliedQueryResolution = resolution;
        appliedResult = await runSearch({
          ...searchInput,
          query: resolution.effective,
          saveSearchHistory,
        });
      }
    }

    if (appliedResult.total === 0 && input.view === "tracks" && input.composer) {
      const staleComposerQuery = await findStaleIndexedComposerQuery(input.composer, session?.memberToken);
      if (staleComposerQuery && staleComposerQuery !== input.composer) {
        appliedResult = await runSearch({
          ...searchInput,
          composerQuery: staleComposerQuery,
          saveSearchHistory,
        });
      }
    }
    const enrichmentStartedAt = Date.now();
    if (input.view === "tracks" && appliedResult.tracks.length) {
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
    const enrichmentMs = Date.now() - enrichmentStartedAt;
    const evidenceQuery = appliedQueryResolution?.effective || input.q;
    let unattributedCount = 0;
    const items = input.q === "%"
      ? (input.view === "albums" ? appliedResult.albums : appliedResult.tracks)
      : input.view === "albums"
        ? appliedResult.albums.map((album) => {
          const matchEvidence = albumSearchEvidence(album, evidenceQuery);
          if (!explainsSearchQuery(matchEvidence, evidenceQuery)) {
            unattributedCount += 1;
          }
          return { ...album, matchEvidence };
        })
        : appliedResult.tracks.map((track) => {
            const matchEvidence = trackSearchEvidence(track, evidenceQuery);
            if (!explainsSearchQuery(matchEvidence, evidenceQuery)) {
              unattributedCount += 1;
            }
            return { ...track, matchEvidence };
          });
    if (unattributedCount) {
      logEvent({
        level: "warn",
        message: "search_match_unattributed",
        route: "search",
        requestId: id,
        total: unattributedCount,
        fieldProfile,
      });
    }
    const orderedItems = input.sort === "relevance"
      ? input.view === "albums"
        ? prioritizeAlbumSearchEvidence(items as Album[], evidenceQuery)
        : prioritizeTitleEvidence<Track>(items as Track[], "trackTitle")
      : items;
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
      titleMatchTotal: isTitlePrioritySearchResult(appliedResult) ? appliedResult.titleTotal : undefined,
      translationOffered: Boolean(translationSuggestion),
      translationApplied: Boolean(appliedQueryResolution),
    });
    return NextResponse.json({
      data: {
        items: orderedItems,
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
        timings: {
          titleSearchMs,
          aggregateSearchMs,
          enrichmentMs,
        },
        capabilities,
        ...(input.sort === "relevance" && isTitlePrioritySearchResult(appliedResult)
          ? { titleMatchTotal: appliedResult.titleTotal }
          : {}),
        ...(translationSuggestion ? { translationSuggestion } : {}),
        ...(appliedQueryResolution ? { queryResolution: appliedQueryResolution } : {}),
        ...(unattributedCount ? { unattributedCount } : {}),
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
