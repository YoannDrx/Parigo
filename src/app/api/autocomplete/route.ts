import { NextRequest, NextResponse } from "next/server";
import { apiError, requestId } from "@/lib/harvest/api";
import { assetUrl, getAssetTemplates } from "@/lib/harvest/assets";
import { cloudSearch, getAlbumsByIds, getTracksByIds } from "@/lib/harvest/catalog";
import { guestRequest } from "@/lib/harvest/client";
import {
  buildAutocompletePayload,
  mapAutocompleteResponse,
  shouldSearchLyrics,
} from "@/lib/harvest/autocomplete";
import { getSearchFilterGroups } from "@/lib/harvest/search-filters";
import { stripLegacySearchQuotes } from "@/lib/search-query";
import { albumSearchEvidence, explainsSearchQuery, trackSearchEvidence } from "@/lib/search-match-evidence";
import { resolveTaxonomySuggestions } from "@/lib/search-taxonomy";
import { logEvent } from "@/lib/logger";
import type { AutocompleteGroup, AutocompleteItem, Track } from "@/types";

function mergePriorityItems(items: AutocompleteItem[], priorityItems: AutocompleteItem[]): AutocompleteItem[] {
  return [...priorityItems, ...items].filter((item, index, all) => (
    all.findIndex((candidate) => candidate.kind === item.kind && candidate.id === item.id) === index
  )).slice(0, 10);
}

function lyricsGroup(tracks: Track[], total: number, excludedTrackIds: Set<string>, locale: "fr" | "en", query: string): AutocompleteGroup | undefined {
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
      matchEvidence: [{ field: "lyrics" as const, value: query, matchedTerms: [query] }],
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
    const searchTitles = (view: "Track" | "Album") => cloudSearch({
      query: stripLegacySearchQuotes(query),
      view,
      textScope: "title",
      limit: view === "Track" ? 10 : 6,
      sort: "RankExpression",
      type: "main",
      language: locale,
      saveSearchHistory: false,
    }).catch(() => null);
    const eagerLyrics = shouldSearchLyrics(query);
    const [payload, templates, eagerLyricsResult, filterGroups, titleTracksResult, titleAlbumsResult] = await Promise.all([
      autocomplete(query),
      getAssetTemplates(),
      eagerLyrics ? searchLyrics() : Promise.resolve(null),
      getSearchFilterGroups(locale).catch(() => []),
      searchTitles("Track"),
      searchTitles("Album"),
    ]);
    const artworkForAlbum = templates.albumArt
      ? (albumId: string) => assetUrl(templates.albumArt, { id: albumId, width: 160, height: 160 })
      : undefined;
    const artworkForPlaylist = templates.playlistArt
      ? (playlistId: string) => assetUrl(templates.playlistArt, { id: playlistId, width: 160, height: 160 })
      : undefined;
    let groups = mapAutocompleteResponse(payload, "tracks", artworkForAlbum, artworkForPlaylist, query);
    const priorityTracks = (titleTracksResult?.tracks ?? []).flatMap((track): AutocompleteItem[] => {
      const matchEvidence = trackSearchEvidence(track, query);
      if (!explainsSearchQuery(matchEvidence.filter((item) => item.field === "trackTitle"), query)) return [];
      return [{
        id: track.id,
        kind: "track",
        label: track.title,
        subtitle: [track.version, track.albumCode || track.cdCode].filter(Boolean).join(" · ") || undefined,
        image: track.albumCover,
        href: `/albums/${track.albumSlug || track.albumId}?track=${encodeURIComponent(track.id)}`,
        matchEvidence,
      }];
    });
    const priorityAlbums = (titleAlbumsResult?.albums ?? []).flatMap((album): AutocompleteItem[] => {
      const matchEvidence = albumSearchEvidence(album, query);
      if (!explainsSearchQuery(matchEvidence.filter((item) => item.field === "albumTitle"), query)) return [];
      return [{
        id: album.id,
        kind: "album",
        label: album.title,
        subtitle: [album.label, album.code].filter(Boolean).join(" · ") || undefined,
        image: album.cover,
        trackCount: album.trackCount || undefined,
        href: `/albums/${album.slug || album.id}`,
        matchEvidence,
      }];
    });
    groups = groups.map((group) => group.key === "tracks"
      ? { ...group, items: mergePriorityItems(group.items, priorityTracks) }
      : group.key === "albums"
        ? { ...group, items: mergePriorityItems(group.items, priorityAlbums) }
        : group);
    const trackItems = groups.find((group) => group.key === "tracks")?.items ?? [];
    const albumItems = groups.find((group) => group.key === "albums")?.items ?? [];
    const [trackDetails, albumDetails] = await Promise.all([
      getTracksByIds(trackItems.map((item) => item.id), undefined, undefined, "autocomplete-evidence").catch(() => []),
      getAlbumsByIds(albumItems.map((item) => item.id)).catch(() => []),
    ]);
    const trackEvidence = new Map(trackDetails.map((track) => [track.id, trackSearchEvidence(track, query)]));
    const albumEvidence = new Map(albumDetails.map((album) => [album.id, albumSearchEvidence(album, query)]));
    let unattributedCount = 0;
    groups = groups.map((group) => {
      if (group.key === "words") return group;
      const items = group.items.flatMap((item) => {
        const matchEvidence = item.kind === "track"
          ? trackEvidence.get(item.id) ?? item.matchEvidence ?? []
          : item.kind === "album"
            ? albumEvidence.get(item.id) ?? item.matchEvidence ?? []
            : item.matchEvidence ?? [];
        if (!explainsSearchQuery(matchEvidence, query)) {
          unattributedCount += 1;
          return [];
        }
        return [{ ...item, matchEvidence }];
      });
      const titleField = group.key === "tracks" ? "trackTitle" : group.key === "albums" ? "albumTitle" : group.key === "playlists" ? "playlistTitle" : undefined;
      const orderedItems = titleField ? items.toSorted((left, right) => (
        Number(Boolean(right.matchEvidence?.some((evidence) => evidence.field === titleField)))
        - Number(Boolean(left.matchEvidence?.some((evidence) => evidence.field === titleField)))
      )) : items;
      return { ...group, items: orderedItems };
    });
    if (unattributedCount) {
      logEvent({ level: "warn", message: "autocomplete_match_unattributed", route: "autocomplete", requestId: id, total: unattributedCount });
    }
    const filterItems = resolveTaxonomySuggestions(query, filterGroups, locale);
    if (filterItems.length) groups.unshift({ key: "filters", count: filterItems.length, items: filterItems });
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
      ? lyricsGroup(resolvedLyrics.tracks, resolvedLyrics.total, excludedTrackIds, locale, query)
      : undefined;
    if (lyrics) groups.push(lyrics);
    const priority = ["filters", "tracks", "albums", "playlists", "words", "composers", "labels", "lyrics"];
    groups.sort((left, right) => priority.indexOf(left.key) - priority.indexOf(right.key));
    return NextResponse.json(
      { data: { groups }, meta: { requestId: id } },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) { return apiError(error, id); }
}
