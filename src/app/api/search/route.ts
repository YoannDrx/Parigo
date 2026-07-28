import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requestId } from "@/lib/harvest/api";
import { cloudSearch } from "@/lib/harvest/catalog";
import { readHarvestSession } from "@/lib/harvest/session";
import { translateFrenchSearchQuery } from "@/lib/search-translation";
import type { QueryResolution } from "@/types";

const sortMap = {
  relevance: "RankExpression",
  recent: "ReleaseDate_Desc",
  oldest: "ReleaseDate_Asc",
  title: "Alphabetic_Asc",
  "title-desc": "Alphabetic_Desc",
} as const;

const querySchema = z.object({
  q: z.string().max(500).default("%"),
  view: z.enum(["tracks", "albums"]).default("tracks"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  sort: z.enum(["relevance", "recent", "oldest", "title", "title-desc"]).catch("relevance").default("relevance"),
  translate: z.enum(["0", "1"]).default("1"),
  type: z.enum(["main", "alternate", "all"]).default("main"),
  labels: z.string().optional(),
  categories: z.string().optional(),
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
    const categories = [...(list(input.categories) || []), ...legacyCategoryValues(request)];
    const skip = (input.page - 1) * input.limit;
    const searchInput = {
      query: input.q.trim() || "%",
      view: input.view === "albums" ? "Album" : "Track",
      textScope: "title",
      skip,
      limit: input.limit,
      sort: sortMap[input.sort],
      type: input.type,
      labels: list(input.labels),
      categories: categories.length ? [...new Set(categories)] : undefined,
      minBpm: input.bpmMin,
      maxBpm: input.bpmMax,
      minDuration: input.durationMin,
      maxDuration: input.durationMax,
      language: input.language,
      saveSearchHistory: Boolean(session),
    } as const;
    let result = await cloudSearch(searchInput, session?.memberToken);
    let appliedQueryResolution: QueryResolution | undefined;
    if (result.total === 0 && input.q !== "%" && input.translate !== "0") {
      const queryResolution = await translateFrenchSearchQuery(input.q);
      if (queryResolution) {
        result = await cloudSearch({
          ...searchInput,
          query: queryResolution.effective,
          saveSearchHistory: Boolean(session),
        }, session?.memberToken);
        if (result.total > 0) appliedQueryResolution = queryResolution;
      }
    }
    const items = input.view === "albums" ? result.albums : result.tracks;
    const publicFacets = {
      bpm: result.facets.bpm,
      duration: result.facets.duration,
      labels: result.facets.labels,
      categories: result.facets.categories,
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
        total: result.total,
        searchHistoryId: result.searchHistoryId,
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
