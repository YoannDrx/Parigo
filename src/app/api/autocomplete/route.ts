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
import { configuredSearchFieldProfile } from "@/lib/harvest/search";
import { getSearchFilterGroups } from "@/lib/harvest/search-filters";
import { isTitlePrioritySearchResult, searchWithTitlePriority } from "@/lib/harvest/title-priority-search";
import { isCatalogIdentifier, stripLegacySearchQuotes } from "@/lib/search-query";
import { albumSearchEvidence, entitySearchEvidence, explainsSearchQuery, prioritizeTitleEvidence, trackSearchEvidence } from "@/lib/search-match-evidence";
import { resolveTaxonomySuggestions } from "@/lib/search-taxonomy";
import { logEvent } from "@/lib/logger";
import type { Album, AutocompleteGroup, AutocompleteItem, Track } from "@/types";

const rankedSort = {
  relevance: "RankExpression",
  recent: "ReleaseDate_Desc",
  oldest: "ReleaseDate_Asc",
  title: "Alphabetic_Asc",
  "title-desc": "Alphabetic_Desc",
} as const;

function listParam(request: NextRequest, key: string): string[] | undefined {
  const values = request.nextUrl.searchParams.get(key)?.split(",").map((value) => value.trim()).filter(Boolean);
  return values?.length ? values : undefined;
}

function numberParam(request: NextRequest, key: string): number | undefined {
  const rawValue = request.nextUrl.searchParams.get(key);
  if (rawValue === null || rawValue.trim() === "") return undefined;
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : undefined;
}

function replaceEntityGroup(
  groups: AutocompleteGroup[],
  key: "tracks" | "albums",
  items: AutocompleteItem[],
  count: number,
): AutocompleteGroup[] {
  const group = { key, items, count } satisfies AutocompleteGroup;
  return groups.some((candidate) => candidate.key === key)
    ? groups.map((candidate) => candidate.key === key ? group : candidate)
    : [...groups, group];
}

function lyricsGroup(tracks: Track[], total: number, excludedTrackIds: Set<string>, locale: "fr" | "en", query: string): AutocompleteGroup | undefined {
  const matchedQuery = stripLegacySearchQuotes(query);
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
      href: `/albums/${track.albumSlug || track.albumId}?track=${encodeURIComponent(track.id)}&panel=lyrics&highlight=${encodeURIComponent(matchedQuery)}`,
      matchEvidence: [{ field: "lyrics" as const, value: matchedQuery, matchedTerms: [matchedQuery] }],
    }));
  return items.length ? { key: "lyrics", count: total, items } : undefined;
}

function trackAutocompleteItem(track: Track, matchEvidence = track.matchEvidence): AutocompleteItem {
  return {
    id: track.id,
    kind: "track",
    label: track.title,
    subtitle: [track.version, track.albumCode || track.cdCode].filter(Boolean).join(" · ") || undefined,
    image: track.albumCover,
    href: `/albums/${track.albumSlug || track.albumId}?track=${encodeURIComponent(track.id)}`,
    matchEvidence,
  };
}

function albumAutocompleteItem(album: Album, matchEvidence = album.matchEvidence): AutocompleteItem {
  return {
    id: album.id,
    kind: "album",
    label: album.title,
    subtitle: [album.label, album.code].filter(Boolean).join(" · ") || undefined,
    image: album.cover,
    trackCount: album.trackCount || undefined,
    href: `/albums/${album.slug || album.id}`,
    matchEvidence,
  };
}

export async function GET(request: NextRequest) {
    const id = requestId();
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim() || "";
    const locale = request.nextUrl.searchParams.get("language") === "en" ? "en" : "fr";
    const requestedSort = request.nextUrl.searchParams.get("sort");
    const sortMode = requestedSort && requestedSort in rankedSort ? requestedSort as keyof typeof rankedSort : "relevance";
    const requestedType = request.nextUrl.searchParams.get("type");
    const type = requestedType === "alternate" ? "alternate" : "main";
    const categories = listParam(request, "categories");
    const styles = listParam(request, "styles");
    const labels = listParam(request, "labels");
    const composerQuery = request.nextUrl.searchParams.get("composer")?.trim() || undefined;
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
    const fieldProfile = configuredSearchFieldProfile();
    const textScope = isCatalogIdentifier(query) || fieldProfile === "aggregate-title-first" ? "aggregate" : fieldProfile;
    const searchEntities = (view: "Track" | "Album") => {
      const searchInput = {
      query: stripLegacySearchQuotes(query),
      view,
      textScope,
      limit: view === "Track" ? 30 : 6,
      sort: rankedSort[sortMode],
      type,
      categories,
      styles,
      labels,
      composerQuery,
      minBpm: numberParam(request, "bpmMin"),
      maxBpm: numberParam(request, "bpmMax"),
      minDuration: numberParam(request, "durationMin"),
      maxDuration: numberParam(request, "durationMax"),
      language: locale,
      saveSearchHistory: false,
      } as const;
      return textScope === "aggregate" && sortMode === "relevance"
        ? searchWithTitlePriority(searchInput, (candidate) => cloudSearch(candidate))
        : cloudSearch(searchInput);
    };
    const eagerLyrics = shouldSearchLyrics(query);
    const [payload, templates, eagerLyricsResult, filterGroups, rankedTracksResult, rankedAlbumsResult] = await Promise.all([
      autocomplete(query),
      getAssetTemplates(),
      eagerLyrics ? searchLyrics() : Promise.resolve(null),
      getSearchFilterGroups(locale).catch(() => []),
      searchEntities("Track").catch(() => null),
      searchEntities("Album").catch(() => null),
    ]);
    const artworkForAlbum = templates.albumArt
      ? (albumId: string) => assetUrl(templates.albumArt, { id: albumId, width: 160, height: 160 })
      : undefined;
    const artworkForPlaylist = templates.playlistArt
      ? (playlistId: string) => assetUrl(templates.playlistArt, { id: playlistId, width: 160, height: 160 })
      : undefined;
    let groups = mapAutocompleteResponse(payload, "tracks", artworkForAlbum, artworkForPlaylist, query);
    if (rankedTracksResult) {
      const rankedTracks = rankedTracksResult.tracks.map((track) => trackAutocompleteItem(track));
      groups = replaceEntityGroup(groups, "tracks", rankedTracks, rankedTracksResult.total);
    }
    if (rankedAlbumsResult) {
      const rankedAlbums = rankedAlbumsResult.albums.map((album) => albumAutocompleteItem(album));
      groups = replaceEntityGroup(groups, "albums", rankedAlbums, rankedAlbumsResult.total);
    }
    const existingLabelGroup = groups.find((group) => group.key === "labels");
    if ((!existingLabelGroup || existingLabelGroup.items.length === 0) && isCatalogIdentifier(query)) {
      const albumWithLabel = rankedAlbumsResult?.albums.find((album) => album.labelSlug && album.label && album.code);
      const reference = albumWithLabel?.code?.replace(/[^a-z0-9]/gi, "").match(/^[a-z]{2,8}/i)?.[0]?.toUpperCase();
      const matchEvidence = reference
        ? entitySearchEvidence(query, [{ field: "catalogReference", values: [reference] }])
        : [];
      if (albumWithLabel?.labelSlug && albumWithLabel.label && reference && explainsSearchQuery(matchEvidence, query)) {
        const item: AutocompleteItem = {
          id: albumWithLabel.labelSlug,
          kind: "label",
          label: albumWithLabel.label,
          subtitle: `Réf. ${reference}`,
          href: `/search?view=${request.nextUrl.searchParams.get("view") === "albums" ? "albums" : "tracks"}&type=main&labels=${encodeURIComponent(albumWithLabel.labelSlug)}`,
          matchEvidence,
        };
        groups = existingLabelGroup
          ? groups.map((group) => group.key === "labels" ? { ...group, count: Math.max(1, group.count), items: [item] } : group)
          : [...groups, { key: "labels", count: 1, items: [item] }];
      }
    }
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
      const orderedItems = titleField && (sortMode === "relevance" || group.key === "playlists")
        ? prioritizeTitleEvidence(items, titleField)
        : items;
      return { ...group, items: group.key === "tracks" ? orderedItems.slice(0, 10) : orderedItems };
    });
    const evidenceQuery = stripLegacySearchQuotes(query);
    const titleTrackItems = (rankedTracksResult && isTitlePrioritySearchResult(rankedTracksResult)
      ? rankedTracksResult.titleTracks
      : rankedTracksResult?.tracks ?? []).slice(0, 8).flatMap((track) => {
      const matchEvidence = trackSearchEvidence(track, evidenceQuery).filter((evidence) => evidence.field === "trackTitle");
      return explainsSearchQuery(matchEvidence, evidenceQuery) ? [trackAutocompleteItem(track, matchEvidence)] : [];
    });
    const titleAlbumItems = (rankedAlbumsResult && isTitlePrioritySearchResult(rankedAlbumsResult)
      ? rankedAlbumsResult.titleAlbums
      : rankedAlbumsResult?.albums ?? []).slice(0, 3).flatMap((album) => {
      const matchEvidence = albumSearchEvidence(album, evidenceQuery).filter((evidence) => evidence.field === "albumTitle");
      return explainsSearchQuery(matchEvidence, evidenceQuery) ? [albumAutocompleteItem(album, matchEvidence)] : [];
    });
    const titlePlaylistItems = (groups.find((group) => group.key === "playlists")?.items ?? [])
      .filter((item) => item.matchEvidence?.some((evidence) => evidence.field === "playlistTitle"))
      .slice(0, 1);
    const titleItems = [...titleTrackItems, ...titleAlbumItems, ...titlePlaylistItems];
    if (titleItems.length) {
      const titledItemKeys = new Set(titleItems.map((item) => `${item.kind}:${item.id}`));
      groups = [
        {
          key: "titles",
          count: (rankedTracksResult && isTitlePrioritySearchResult(rankedTracksResult) ? rankedTracksResult.titleTotal : titleTrackItems.length)
            + (rankedAlbumsResult && isTitlePrioritySearchResult(rankedAlbumsResult) ? rankedAlbumsResult.titleTotal : titleAlbumItems.length)
            + titlePlaylistItems.length,
          items: titleItems,
        },
        ...groups.map((group) => group.key === "tracks" || group.key === "albums" || group.key === "playlists"
          ? { ...group, items: group.items.filter((item) => !titledItemKeys.has(`${item.kind}:${item.id}`)) }
          : group),
      ];
    }
    if (unattributedCount) {
      logEvent({ level: "warn", message: "autocomplete_match_unattributed", route: "autocomplete", requestId: id, total: unattributedCount });
    }
    const filterItems = resolveTaxonomySuggestions(query, filterGroups, locale);
    if (filterItems.length) groups.unshift({ key: "filters", count: filterItems.length, items: filterItems });
    const editorialResultCount = groups
      .filter((group) => group.key === "titles" || group.key === "tracks" || group.key === "albums" || group.key === "playlists")
      .reduce((count, group) => count + group.items.length, 0);
    const fallbackLyricsResult = !eagerLyricsResult && shouldSearchLyrics(query, editorialResultCount)
      ? await searchLyrics()
      : null;
    const resolvedLyrics = eagerLyricsResult || fallbackLyricsResult;
    const excludedTrackIds = new Set(
      groups
        .filter((group) => group.key === "titles" || group.key === "tracks")
        .flatMap((group) => group.items.filter((item) => item.kind === "track").map((item) => item.id)),
    );
    const lyrics = resolvedLyrics
      ? lyricsGroup(resolvedLyrics.tracks, resolvedLyrics.total, excludedTrackIds, locale, query)
      : undefined;
    if (lyrics) groups.push(lyrics);
    const priority = ["titles", "filters", "labels", "tracks", "albums", "playlists", "words", "composers", "lyrics"];
    groups.sort((left, right) => priority.indexOf(left.key) - priority.indexOf(right.key));
    return NextResponse.json(
      { data: { groups }, meta: { requestId: id } },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) { return apiError(error, id); }
}
