import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requestId } from "@/lib/harvest/api";
import { cloudSearch } from "@/lib/harvest/catalog";
import {
  collectHarvestComposerSearchItems,
  normalizeHarvestComposerSearchValue,
} from "@/lib/harvest/composer-credits";
import type { Track } from "@/types";

const querySchema = z.object({
  q: z.string().trim().min(2).max(120).refine(
    (value) => normalizeHarvestComposerSearchValue(value).length >= 2,
    "La recherche doit contenir au moins deux lettres ou chiffres",
  ),
});

const PAGE_SIZE = 100;
const MAX_TRACKS = 500;

export async function GET(request: NextRequest) {
  const id = requestId();
  try {
    const { q } = querySchema.parse({ q: request.nextUrl.searchParams.get("q") ?? "" });
    const tracks: Array<Pick<Track, "id" | "composers">> = [];
    let offset = 0;
    let total = 1;

    while (offset < total && offset < MAX_TRACKS) {
      const result = await cloudSearch({
        view: "Track",
        query: "%",
        textScope: "title",
        // Intentionnellement global : tous les compositeurs du catalogue
        // visible par le jeton Harvest sont recherchables, pas seulement Parigo.
        composerQuery: q,
        composerMatch: "contains",
        skip: offset,
        limit: PAGE_SIZE,
        type: "main",
        sort: "Alphabetic_Asc",
      });
      total = result.total;
      tracks.push(...result.tracks);
      if (!result.tracks.length) break;
      offset += result.tracks.length;
    }

    const items = collectHarvestComposerSearchItems(tracks, q);
    return NextResponse.json({
      data: { items },
      meta: {
        requestId: id,
        matchedTracks: total,
        inspectedTracks: Math.min(offset, total),
        incomplete: offset < total,
      },
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "X-Request-ID": id,
      },
    });
  } catch (error) {
    return apiError(error, id);
  }
}
