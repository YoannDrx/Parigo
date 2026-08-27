import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requestId } from "@/lib/harvest/api";
import { getCachedPlaylistDiscovery } from "@/lib/harvest/catalog-cache";
import type { Playlist, Track } from "@/types";

const schema = z.object({
  kind: z.enum(["playlists", "tracks"]).default("playlists"),
  moods: z.string().optional(),
  genres: z.string().optional(),
  instruments: z.string().optional(),
  musicFor: z.string().optional(),
  sort: z.enum(["title-asc", "title-desc"]).default("title-asc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

type FacetKey = "moods" | "genres" | "instruments" | "musicFor";

function csv(value?: string) {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}

function unsigned(value: string) {
  return value.startsWith("-") ? value.slice(1) : value;
}

function matchesFacet(terms: string[] | undefined, values: string[]) {
  const included = values.filter((value) => !value.startsWith("-"));
  const excluded = values.filter((value) => value.startsWith("-")).map(unsigned);
  const available = terms ?? [];
  return (!included.length || included.some((value) => available.includes(value)))
    && !excluded.some((value) => available.includes(value));
}

function matchesTrack(track: Track, filters: Record<FacetKey, string[]>) {
  return matchesFacet(track.moods, filters.moods)
    && matchesFacet(track.genres, filters.genres)
    && matchesFacet(track.instruments, filters.instruments)
    && matchesFacet(track.musicFor, filters.musicFor);
}

function facetItems(playlists: Playlist[], tracks: Track[], kind: "playlists" | "tracks", key: FacetKey) {
  const counts = new Map<string, number>();
  if (kind === "tracks") {
    tracks.forEach((track) => track[key]?.forEach((term) => counts.set(term, (counts.get(term) ?? 0) + 1)));
  } else {
    playlists.forEach((playlist) => playlist[key]?.forEach((term) => counts.set(term, (counts.get(term) ?? 0) + 1)));
  }
  return [...counts]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 30)
    .map(([value, count]) => ({ value, label: value, count }));
}

export async function GET(request: NextRequest) {
  const id = requestId();
  try {
    const input = schema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const playlists = await getCachedPlaylistDiscovery();
    const tracksById = new Map<string, Track>();
    playlists.forEach((playlist) => playlist.tracks?.forEach((track) => tracksById.set(track.id, track)));
    const allTracks = [...tracksById.values()];
    const filters: Record<FacetKey, string[]> = {
      moods: csv(input.moods),
      genres: csv(input.genres),
      instruments: csv(input.instruments),
      musicFor: csv(input.musicFor),
    };
    const hasFilters = Object.values(filters).some((values) => values.length > 0);
    const matchingTracks = allTracks.filter((track) => matchesTrack(track, filters));
    const matchingTrackIds = new Set(matchingTracks.map((track) => track.id));
    const playlistIds = playlists.flatMap((playlist) => {
      if (!hasFilters) return [playlist.id];
      return playlist.tracks?.some((track) => matchingTrackIds.has(track.id)) ? [playlist.id] : [];
    });
    const direction = input.sort === "title-desc" ? -1 : 1;
    matchingTracks.sort((left, right) => left.title.localeCompare(right.title, "fr", { sensitivity: "base" }) * direction);
    const offset = (input.page - 1) * input.limit;
    const tracks = matchingTracks.slice(offset, offset + input.limit);

    return NextResponse.json({
      data: {
        playlistIds,
        tracks,
        facets: {
          moods: facetItems(playlists, allTracks, input.kind, "moods"),
          genres: facetItems(playlists, allTracks, input.kind, "genres"),
          instruments: facetItems(playlists, allTracks, input.kind, "instruments"),
          musicFor: facetItems(playlists, allTracks, input.kind, "musicFor"),
        },
      },
      meta: {
        playlistTotal: playlistIds.length,
        trackTotal: matchingTracks.length,
        page: input.page,
        pageSize: input.limit,
        requestId: id,
      },
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        "X-Request-ID": id,
      },
    });
  } catch (error) {
    return apiError(error, id);
  }
}
