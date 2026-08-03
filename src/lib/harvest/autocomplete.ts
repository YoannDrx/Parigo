import type { AutocompleteGroup, AutocompleteItem, AutocompleteKind } from "@/types";
import { isRecord } from "./errors";
import { asNumber, asString, pick } from "./values";

const GROUP_LIMIT = 10;

export function buildAutocompletePayload(query: string, view: "tracks" | "albums" = "tracks"): Record<string, unknown> {
  const tracks = view === "tracks";
  const albums = view === "albums";
  return {
    Keyword: query.trim(),
    LibraryType: "",
    ReturnTracks: tracks,
    ReturnTracks_MainOnly: true,
    ReturnTracks_Fields: "DisplayTitle",
    ReturnTracks_Limit: GROUP_LIMIT,
    ReturnTracks_Order: "date_descent",
    ReturnTracks_DisableKeywordGroup: true,
    ReturnAlbums: albums,
    ReturnAlbums_Fields: "DisplayTitle",
    ReturnAlbums_Limit: GROUP_LIMIT,
    ReturnAlbums_Order: "date_descent",
    ReturnAlbums_DisableKeywordGroup: true,
    ReturnLibraries: false,
    ReturnLibraries_Fields: "Name,Prefix,Description",
    ReturnLibraries_Limit: GROUP_LIMIT,
    ReturnLibraries_DisableKeywordGroup: false,
    ReturnStyles: false,
    ReturnCategoryAttributes: false,
    ReturnCategoryAttributes_Limit: GROUP_LIMIT,
    ReturnCategoryAttributes_ShowOnPlayerOnly: false,
    ReturnCategoryAttributes_IncludeCategory: false,
    ReturnCategoryAttributes_Order: "AllAlphabetic",
    ReturnCategoryAttributes_DisableKeywordGroup: false,
    ReturnRightHolders: false,
    ReturnRightHolders_Fields: "firstname, lastname",
    ReturnRightHolders_Limit: GROUP_LIMIT,
    ReturnRightHolders_DisableKeywordGroup: false,
    RightHolderTypes: "",
    ReturnLyrics: false,
    ReturnLyrics_Limit: GROUP_LIMIT,
    ReturnLyrics_MainOnly: false,
    ReturnLyrics_DisableKeywordGroup: false,
    ReturnKeywords: false,
    ReturnKeywordsMaxSize: GROUP_LIMIT,
    ReturnKeywordsForMatch: false,
    ReturnKeywordsForMatch_Fields: "TrackKeywords, TrackInstrumentation, TrackGenre, TrackCategories",
    ReturnKeywordsForMatch_HideWhenSearchTerm: false,
    ReturnKeywordsDisableKeywordGroup: false,
    ReturnFeaturedPlaylists: false,
    ReturnFeaturedPlaylist_Fields: "ProjectTitle,Description",
    ReturnFeaturedPlaylists_Limit: GROUP_LIMIT,
    ReturnFeaturedPlaylist_Order: "Alphabetic_Ascent",
    ReturnFeaturedPlaylists_DisableKeywordGroup: false,
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

export function mapAutocompleteResponse(payload: unknown): AutocompleteGroup[] {
  const source = isRecord(payload) ? payload : {};
  const trackSource = values(source, "Tracks", "tracks");
  const albumSource = values(source, "Albums", "albums");
  const playlistSource = values(source, "FeaturedPlaylists", "Playlists", "featuredPlaylists");
  const labelSource = values(source, "Libraries", "libraries");
  const composerSource = values(source, "rightHolders", "RightHolders", "Composers", "composers");
  const lyricsSource = values(source, "Lyrics", "lyrics");
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
    return {
      id,
      label: title,
      subtitle: [version, code].filter(Boolean).join(" · ") || undefined,
      href: albumId ? `/albums/${albumId}?track=${encodeURIComponent(id)}` : undefined,
    };
  }).slice(0, GROUP_LIMIT);
  const albums = mapRecords(albumSource, "album", (item, index) => {
    const id = asString(pick(item, "AlbumID", "ID"), `album-${index}`);
    return {
      id,
      label: asString(pick(item, "DisplayTitle", "Name", "Title")),
      subtitle: asString(pick(item, "CDCode", "LibraryName")) || undefined,
      image: asString(pick(item, "ArtworkUrl", "ImageUrl", "CoverUrl")) || undefined,
      href: `/albums/${id}`,
    };
  }).slice(0, GROUP_LIMIT);
  const playlists = mapRecords(playlistSource, "playlist", (item, index) => {
    const id = asString(pick(item, "FeaturedPlaylistID", "PlaylistID", "ID"), `playlist-${index}`);
    return {
      id,
      label: asString(pick(item, "DisplayTitle", "ProjectTitle", "Name", "Title")),
      subtitle: asString(pick(item, "Description")) || undefined,
      href: `/playlists/${id}`,
    };
  }).slice(0, GROUP_LIMIT);
  const labels = mapRecords(labelSource, "label", (item, index) => {
    const id = asString(pick(item, "LibraryID", "ID"), `label-${index}`);
    return {
      id,
      label: asString(pick(item, "Name", "DisplayTitle")),
      href: `/labels/${id}`,
    };
  }).slice(0, GROUP_LIMIT);
  const composers = mapRecords(composerSource, "composer", (item, index) => {
    const id = asString(pick(item, "RightHolderID", "ComposerID", "ID"), `composer-${index}`);
    const label = asString(pick(item, "DisplayName", "Name", "FullName"))
      || [
        asString(pick(item, "firstname", "FirstName")),
        asString(pick(item, "lastname", "LastName")),
      ].filter(Boolean).join(" ");
    return {
      id,
      label,
      href: `/search?view=tracks&type=main&composer=${encodeURIComponent(label)}`,
    };
  }).slice(0, GROUP_LIMIT);
  const lyrics = mapWords(lyricsSource, "lyrics");
  const keywords = mapWords(keywordsSource, "keyword");
  const words = [...lyrics, ...keywords]
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
