import type { AutocompleteGroup, AutocompleteItem, AutocompleteKind } from "@/types";
import { albumIdentity } from "./album-identity";
import { isRecord } from "./errors";
import { entitySearchEvidence } from "../search-match-evidence";
import { asList, asNumber, asString, pick } from "./values";

const GROUP_LIMIT = 10;
const QUOTED_EXPRESSION = /^(["'])[\s\S]+\1$/;

type ArtworkForAlbum = (albumId: string) => string | undefined;
type ArtworkForPlaylist = (playlistId: string) => string | undefined;

export function shouldSearchLyrics(query: string, editorialResultCount = Number.POSITIVE_INFINITY): boolean {
  const normalized = query.trim();
  if (!normalized) return false;
  if (QUOTED_EXPRESSION.test(normalized)) return true;
  const meaningfulWords = normalized.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
  return meaningfulWords.length >= 3 || editorialResultCount <= 2;
}

export function buildAutocompletePayload(query: string, view: "tracks" | "albums" = "tracks"): Record<string, unknown> {
  return {
    Keyword: query.trim(),
    LibraryType: "",
    ReturnTracks: true,
    ReturnTracks_MainOnly: true,
    ReturnTracks_Fields: "DisplayTitle,AlternateTitle,Version,AlbumDisplayTitle,Comment,Keywords,Genre,Mood,MusicFor,Instrumentation,CDCode",
    ReturnTracks_Limit: view === "tracks" ? GROUP_LIMIT : 6,
    ReturnTracks_Order: "date_descent",
    ReturnTracks_DisableKeywordGroup: true,
    ReturnAlbums: true,
    ReturnAlbums_Fields: "DisplayTitle,Description,Keywords",
    ReturnAlbums_Limit: view === "albums" ? GROUP_LIMIT : 6,
    ReturnAlbums_Order: "date_descent",
    ReturnAlbums_DisableKeywordGroup: true,
    ReturnLibraries: true,
    ReturnLibraries_Fields: "Name,Prefix,Description",
    ReturnLibraries_Limit: GROUP_LIMIT,
    ReturnLibraries_DisableKeywordGroup: true,
    ReturnStyles: false,
    ReturnCategoryAttributes: false,
    ReturnCategoryAttributes_Limit: GROUP_LIMIT,
    ReturnCategoryAttributes_ShowOnPlayerOnly: false,
    ReturnCategoryAttributes_IncludeCategory: false,
    ReturnCategoryAttributes_Order: "AllAlphabetic",
    ReturnCategoryAttributes_DisableKeywordGroup: true,
    ReturnRightHolders: true,
    ReturnRightHolders_Fields: "firstname, lastname",
    ReturnRightHolders_Limit: GROUP_LIMIT,
    ReturnRightHolders_DisableKeywordGroup: true,
    RightHolderTypes: "",
    ReturnLyrics: false,
    ReturnLyrics_Limit: GROUP_LIMIT,
    ReturnLyrics_MainOnly: false,
    ReturnLyrics_DisableKeywordGroup: true,
    ReturnKeywords: true,
    ReturnKeywordsMaxSize: GROUP_LIMIT,
    ReturnKeywordsForMatch: false,
    ReturnKeywordsForMatch_Fields: "TrackKeywords, TrackInstrumentation, TrackGenre, TrackMood, TrackMusicFor",
    ReturnKeywordsForMatch_HideWhenSearchTerm: false,
    ReturnKeywordsDisableKeywordGroup: true,
    ReturnFeaturedPlaylists: true,
    ReturnFeaturedPlaylist_Fields: "ProjectTitle,Description",
    ReturnFeaturedPlaylists_Limit: GROUP_LIMIT,
    ReturnFeaturedPlaylist_Order: "Alphabetic_Ascent",
    ReturnFeaturedPlaylists_DisableKeywordGroup: true,
  };
}

function values(payload: Record<string, unknown>, ...keys: string[]): unknown[] {
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
}

function total(payload: Record<string, unknown>, fallback: number, ...keys: string[]): number {
  for (const key of keys) {
    if (payload[key] !== undefined) return asNumber(payload[key], fallback);
  }
  return fallback;
}

function mapRecords(
  source: unknown[],
  kind: AutocompleteKind,
  map: (record: Record<string, unknown>, index: number) => Omit<AutocompleteItem, "kind">,
): AutocompleteItem[] {
  return source.flatMap((value, index) => {
    if (!isRecord(value)) return [];
    const item = map(value, index);
    return item.label ? [{ ...item, kind }] : [];
  });
}

function mapWords(source: unknown[], kind: "lyrics" | "keyword"): AutocompleteItem[] {
  return source.flatMap((value, index) => {
    const label = typeof value === "string"
      ? value.trim()
      : isRecord(value)
        ? asString(pick(value, "Value", "Name", "Text", "Keyword", "Lyrics"))
        : "";
    if (!label || label.length > 140) return [];
    const id = isRecord(value)
      ? asString(pick(value, "ID", "KeywordID", "LyricsID"), `${kind}-${index}-${label}`)
      : `${kind}-${index}-${label}`;
    return [{ id, kind, label }];
  }).slice(0, GROUP_LIMIT);
}

export function mapAutocompleteResponse(
  payload: unknown,
  view: "tracks" | "albums" = "tracks",
  artworkForAlbum?: ArtworkForAlbum,
  artworkForPlaylist?: ArtworkForPlaylist,
  query = "",
): AutocompleteGroup[] {
  const source = isRecord(payload) ? payload : {};
  const trackSource = values(source, "Tracks", "tracks");
  const albumSource = values(source, "Albums", "albums");
  const playlistSource = values(source, "FeaturedPlaylists", "Playlists", "featuredPlaylists");
  const labelSource = values(source, "Libraries", "libraries");
  const composerSource = values(source, "rightHolders", "RightHolders", "Composers", "composers");
  const keywordsSource = values(source, "Keywords", "keywords", "Tags", "tags", "CategoryAttributes");

  const distinctTrackSource = trackSource.filter((value, index, items) => {
    if (!isRecord(value)) return false;
    const title = asString(pick(value, "DisplayTitle", "Name", "Title"));
    if (!title || /\bstem\b|_underscore\b/i.test(title)) return false;
    const normalized = title
      .replace(/\s*\((?:15|30|60)\s*sec\)$/i, "")
      .replace(/\s+[A-Z]$/i, "")
      .trim()
      .toLocaleLowerCase();
    return items.findIndex((candidate) => {
      if (!isRecord(candidate)) return false;
      const candidateTitle = asString(pick(candidate, "DisplayTitle", "Name", "Title"))
        .replace(/\s*\((?:15|30|60)\s*sec\)$/i, "")
        .replace(/\s+[A-Z]$/i, "")
        .trim()
        .toLocaleLowerCase();
      return candidateTitle === normalized;
    }) === index;
  });
  const tracks = mapRecords(distinctTrackSource, "track", (item, index) => {
    const id = asString(pick(item, "TrackID", "ID"), `track-${index}`);
    const albumId = asString(pick(item, "AlbumID"));
    const title = asString(pick(item, "DisplayTitle", "Name", "Title"));
    const version = asString(pick(item, "Version", "AlternateTitle"));
    const code = asString(pick(item, "CDCode"));
    const evidence = entitySearchEvidence(query, [
      { field: "trackTitle", values: [title] },
      { field: "albumTitle", values: [asString(pick(item, "AlbumDisplayTitle", "AlbumName", "AlbumTitle"))] },
      { field: "description", values: [asString(pick(item, "Comment", "Description"))] },
      { field: "keyword", values: asList(pick(item, "Keywords")) },
      { field: "genre", values: asList(pick(item, "Genre")) },
      { field: "mood", values: asList(pick(item, "Mood")) },
      { field: "musicFor", values: asList(pick(item, "MusicFor")) },
      { field: "instrument", values: asList(pick(item, "Instrumentation")) },
      { field: "catalogReference", values: [code] },
    ]);
    return {
      id,
      label: title,
      subtitle: [version, code].filter(Boolean).join(" · ") || undefined,
      image: albumId ? artworkForAlbum?.(albumId) : undefined,
      href: albumId ? `/albums/${albumId}?track=${encodeURIComponent(id)}` : undefined,
      ...(evidence.length ? { matchEvidence: evidence } : {}),
    };
  }).slice(0, GROUP_LIMIT);
  const albums = mapRecords(albumSource, "album", (item, index) => {
    const id = asString(pick(item, "AlbumID", "ID"), `album-${index}`);
    const code = asString(pick(item, "CDCode"));
    const identity = albumIdentity(asString(pick(item, "DisplayTitle", "Name", "Title")), code);
    const evidence = entitySearchEvidence(query, [
      { field: "albumTitle", values: [identity.title] },
      { field: "albumDescription", values: [asString(pick(item, "Description", "Detail"))] },
      { field: "albumKeyword", values: asList(pick(item, "Keywords")) },
      { field: "catalogReference", values: [identity.code] },
    ]);
    return {
      id,
      label: identity.title,
      subtitle: [
        asString(pick(item, "LibraryName")),
        identity.code,
      ].filter(Boolean).join(" · ") || undefined,
      image: artworkForAlbum?.(id) || asString(pick(item, "ArtworkUrl", "ImageUrl", "CoverUrl")) || undefined,
      trackCount: asNumber(pick(item, "TrackCount")) || undefined,
      href: `/albums/${id}`,
      ...(evidence.length ? { matchEvidence: evidence } : {}),
    };
  }).slice(0, GROUP_LIMIT);
  const playlists = mapRecords(playlistSource, "playlist", (item, index) => {
    const id = asString(pick(item, "FeaturedPlaylistID", "PlaylistID", "ID"), `playlist-${index}`);
    const label = asString(pick(item, "DisplayTitle", "ProjectTitle", "Name", "Title"));
    const description = asString(pick(item, "Description"));
    const evidence = entitySearchEvidence(query, [
      { field: "playlistTitle", values: [label] },
      { field: "description", values: [description] },
    ]);
    return {
      id,
      label,
      subtitle: description || undefined,
      image: artworkForPlaylist?.(id) || asString(pick(item, "ArtworkUrl", "ImageUrl", "CoverUrl")) || undefined,
      trackCount: asNumber(pick(item, "TrackCount", "TracksCount")) || undefined,
      href: `/playlists/${id}`,
      ...(evidence.length ? { matchEvidence: evidence } : {}),
    };
  }).slice(0, GROUP_LIMIT);
  const labels = mapRecords(labelSource, "label", (item, index) => {
    const id = asString(pick(item, "LibraryID", "ID"), `label-${index}`);
    const label = asString(pick(item, "Name", "DisplayTitle"));
    const evidence = entitySearchEvidence(query, [{ field: "labelName", values: [label] }]);
    return {
      id,
      label,
      href: `/search?view=${view}&type=main&labels=${encodeURIComponent(id)}`,
      ...(evidence.length ? { matchEvidence: evidence } : {}),
    };
  }).slice(0, GROUP_LIMIT);
  const composers = mapRecords(composerSource, "composer", (item, index) => {
    const id = asString(pick(item, "RightHolderID", "ComposerID", "ID"), `composer-${index}`);
    const label = asString(pick(item, "DisplayName", "Name", "FullName"))
      || [
        asString(pick(item, "firstname", "FirstName")),
        asString(pick(item, "lastname", "LastName")),
      ].filter(Boolean).join(" ");
    const evidence = entitySearchEvidence(query, [{ field: "composerName", values: [label] }]);
    return {
      id,
      label,
      href: `/search?view=tracks&type=main&composer=${encodeURIComponent(label)}`,
      ...(evidence.length ? { matchEvidence: evidence } : {}),
    };
  }).slice(0, GROUP_LIMIT);
  const keywords = mapWords(keywordsSource, "keyword");
  const words = keywords
    .filter((item, index, items) => items.findIndex((candidate) => candidate.label.toLocaleLowerCase() === item.label.toLocaleLowerCase()) === index)
    .slice(0, GROUP_LIMIT);

  return [
    { key: "tracks", count: total(source, tracks.length, "TracksFound", "TrackFound"), items: tracks },
    { key: "albums", count: total(source, albums.length, "AlbumsFound", "AlbumFound"), items: albums },
    { key: "playlists", count: total(source, playlists.length, "FeaturedPlaylistsFound", "PlaylistsFound"), items: playlists },
    { key: "labels", count: total(source, labels.length, "LibraryFound", "LibrariesFound"), items: labels },
    { key: "composers", count: total(source, composers.length, "RightHolderFound", "ComposerFound"), items: composers },
    {
      key: "words",
      count: total(source, words.length, "KeywordsFound", "LyricsFound", "TagsFound", "CategoryAttributesFound"),
      items: words,
    },
  ];
}
