import { NextRequest, NextResponse } from "next/server";
import { apiError, requestId } from "@/lib/harvest/api";
import { assetUrl, getAssetTemplates } from "@/lib/harvest/assets";
import { cloudSearch } from "@/lib/harvest/catalog";
import { guestRequest } from "@/lib/harvest/client";
import {
  buildAutocompletePayload,
  mapAutocompleteResponse,
  shouldSearchLyrics,
} from "@/lib/harvest/autocomplete";
import { stripLegacySearchQuotes } from "@/lib/search-query";
import type { AutocompleteGroup, Track } from "@/types";

function lyricsGroup(tracks: Track[], total: number, excludedTrackIds: Set<string>, locale: "fr" | "en"): AutocompleteGroup | undefined {
  const items = tracks
    .filter((track) => !excludedTrackIds.has(track.id))
    .slice(0, 3)
    .map((track) => ({
      id: track.id,
      kind: "lyrics" as const,
      label: track.title,
      subtitle: [
        locale === "fr" ? "Trouvé dans les paroles" : "Found in lyrics",
        track.albumTitle,
        track.albumCode || track.cdCode,
      ].filter(Boolean).join(" · "),
      image: track.albumCover,
      href: `/albums/${track.albumSlug || track.albumId}?track=${encodeURIComponent(track.id)}`,
    }));
  return items.length ? { key: "lyrics", count: total, items } : undefined;
}

export async function GET(request: NextRequest) {
    const id = requestId();
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim() || "";
    const locale = request.nextUrl.searchParams.get("language") === "en" ? "en" : "fr";
    if (query.length < 2) return NextResponse.json({ data: { groups: [] }, meta: { requestId: id } });
    const autocomplete = (keyword: string) => guestRequest<Record<string, unknown>>(
      (token) => `/autocomplete/${token}`,
      { method: "POST", body: JSON.stringify(buildAutocompletePayload(keyword)) },
    );
    const searchLyrics = async () => {
      try {
        return await cloudSearch({
          query: stripLegacySearchQuotes(query),
          view: "Track",
          textScope: "lyrics",
          limit: 3,
          sort: "RankExpression",
          type: "main",
          language: locale,
          saveSearchHistory: false,
        });
      } catch {
        return null;
      }
    };
    const eagerLyrics = shouldSearchLyrics(query);
    const [payload, templates, eagerLyricsResult] = await Promise.all([
      autocomplete(query),
      getAssetTemplates(),
      eagerLyrics ? searchLyrics() : Promise.resolve(null),
    ]);
    const artworkForAlbum = templates.albumArt
      ? (albumId: string) => assetUrl(templates.albumArt, { id: albumId, width: 160, height: 160 })
      : undefined;
    const artworkForPlaylist = templates.playlistArt
      ? (playlistId: string) => assetUrl(templates.playlistArt, { id: playlistId, width: 160, height: 160 })
      : undefined;
    const groups = mapAutocompleteResponse(payload, "tracks", artworkForAlbum, artworkForPlaylist);
    const editorialResultCount = groups
      .filter((group) => group.key === "tracks" || group.key === "albums" || group.key === "playlists")
      .reduce((count, group) => count + group.items.length, 0);
    const fallbackLyricsResult = !eagerLyricsResult && shouldSearchLyrics(query, editorialResultCount)
      ? await searchLyrics()
      : null;
    const resolvedLyrics = eagerLyricsResult || fallbackLyricsResult;
    const excludedTrackIds = new Set(
      groups.find((group) => group.key === "tracks")?.items.map((item) => item.id) ?? [],
    );
    const lyrics = resolvedLyrics
      ? lyricsGroup(resolvedLyrics.tracks, resolvedLyrics.total, excludedTrackIds, locale)
      : undefined;
    if (lyrics) groups.push(lyrics);
    const priority = ["tracks", "albums", "playlists", "words", "composers", "labels", "lyrics"];
    groups.sort((left, right) => priority.indexOf(left.key) - priority.indexOf(right.key));
    return NextResponse.json(
      { data: { groups }, meta: { requestId: id } },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) { return apiError(error, id); }
}
