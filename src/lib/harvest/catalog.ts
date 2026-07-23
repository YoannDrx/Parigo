import "server-only";

import type {
  Album,
  CatalogCategory,
  Label,
  PaginatedResult,
  Playlist,
  SearchFacets,
  Track,
} from "@/types";
import { assetUrl, getAssetTemplates, type HarvestAssetTemplates } from "./assets";
import { getRegionId, guestRequest, memberRequest } from "./client";
import {
  HarvestAlbumSchema,
  HarvestPlaylistSchema,
  HarvestSearchResponseSchema,
  HarvestTrackSchema,
  type HarvestAlbumPayload,
  type HarvestPlaylistPayload,
  type HarvestTrackPayload,
} from "./contracts";
import { HarvestError, isRecord } from "./errors";
import { buildCloudSearch, mapSearchFacets, searchHistoryIdFromResponse, type HarvestSearchInput } from "./search";
import {
  asBoolean,
  asIsoDate,
  asList,
  asNumber,
  asString,
  pick,
  recordArray,
  slugify,
} from "./values";

type HarvestRecord = Record<string, unknown>;

function totalFrom(payload: unknown, fallback: number, ...keys: string[]): number {
  if (!isRecord(payload)) return fallback;
  for (const key of keys) {
    const value = asNumber(payload[key], Number.NaN);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
}

function titleOf(item: { DisplayTitle?: string; Name?: string; Title?: string }): string {
  return item.DisplayTitle || item.Name || item.Title || "Untitled";
}

function mapCredits(item: HarvestTrackPayload): Array<{ name: string; slug: string }> {
  return asList(item.Artist || item.Composer).map((name) => ({
    name,
    slug: slugify(name),
  }));
}

export function mapTrack(
  item: HarvestRecord,
  templates: HarvestAssetTemplates,
  album?: Partial<Album>,
  source = "search",
): Track {
  const parsed = HarvestTrackSchema.parse(item);
  const id = parsed.ID;
  const albumId = parsed.AlbumID || album?.id || "";
  const albumTitle = parsed.AlbumName || parsed.AlbumTitle || album?.title || "";
  const libraryId = parsed.LibraryID || album?.labelSlug || "";
  const libraryName = parsed.LibraryName || album?.label || "Parigo";
  const composers = asList(parsed.Composer);
  const publishers = asList(parsed.Publisher);
  const normalizedVersion = parsed.Version?.trim().toLowerCase();
  const isMainVersion = normalizedVersion === "main" || normalizedVersion === "main version";
  const track: Track = {
    id,
    slug: id,
    title: titleOf(parsed),
    duration: parsed.LengthSeconds || 0,
    bpm: parsed.Bpm || null,
    key: asString(item.Key || item.MusicKey) || null,
    audioUrl: templates.trackStream
      ? assetUrl(templates.trackStream, { id, source })
      : null,
    albumId,
    albumTitle,
    albumSlug: albumId,
    albumCover:
      album?.cover ||
      (templates.albumArt ? assetUrl(templates.albumArt, { id: albumId, width: 640, height: 640 }) : undefined),
    albumLabel: libraryName,
    albumLabelSlug: libraryId,
    genres: asList(parsed.Genre),
    moods: asList(parsed.Mood),
    instruments: asList(parsed.Instrumentation),
    isVocal: Boolean(asString(item.Lyrics)) || /vocal|voice/i.test(parsed.Version || ""),
    waveform: null,
    trackNumber: parsed.TrackNumber || undefined,
    artists: mapCredits(parsed),
    composers,
    publishers,
    version: parsed.Version || undefined,
    // Some Cloud Search payloads flag the main version as alternate. Harvest's
    // explicit version and main-track relationship are the reliable contract.
    isAlternate: isMainVersion ? false : Boolean(parsed.MainTrackID || parsed.IsAlternate),
    alternateCount: parsed.AlternateCount || 0,
    stemCount: parsed.StemCount || 0,
    isrc: parsed.ISRC || undefined,
    mainTrackId: parsed.MainTrackID || undefined,
    description: parsed.Comment || undefined,
    lyrics: parsed.Lyrics || undefined,
    cdCode: parsed.CDCode || undefined,
    tags: asList(parsed.Tags),
    keywords: asList(parsed.Keywords),
    musicFor: asList(parsed.MusicFor),
    rightHolders: parsed.RightHolders.map((holder) => ({ id: holder.ID, name: holder.Name || [holder.FirstName, holder.MiddleName, holder.LastName].filter(Boolean).join(" "), capacity: holder.Capacity || undefined })).filter((holder) => holder.name),
    stems: parsed.Stems.filter(isRecord).map((stem) => ({ id: asString(stem.ID), title: asString(stem.DisplayTitle || stem.Name) || undefined })).filter((stem) => stem.id),
    rate: parsed.TrackRate || null,
    isExplicit: parsed.IsExplicit || false,
    libraryType: parsed.LibraryType || undefined,
    highlighted: parsed.Highlighted || false,
  };
  track.alternateTracks = parsed.AlternateTracks
    .filter(isRecord)
    .map((alternate) => ({ ...mapTrack(alternate, templates, album, `${source}-alternate`), isAlternate: true }));
  return track;
}

export function mapAlbum(item: HarvestRecord, templates: HarvestAssetTemplates): Album {
  const parsed: HarvestAlbumPayload = HarvestAlbumSchema.parse(item);
  const id = parsed.ID;
  const labelId = parsed.LibraryID || "";
  const styles = parsed.Styles.map((style) => ({ id: style.ID, name: style.Name }));
  const genres = styles.length
    ? styles.map((style) => style.name)
    : asList(parsed.Genre || parsed.Keywords);
  const releaseDate = asIsoDate(parsed.ReleaseDate);
  return {
    id,
    slug: id,
    title: titleOf(parsed),
    label: parsed.LibraryName || "Parigo",
    labelSlug: labelId,
    cover: templates.albumArt
      ? assetUrl(templates.albumArt, { id, width: 800, height: 800 })
      : "/images/placeholder-album.jpg",
    description: parsed.Detail || parsed.Description || null,
    genres,
    moods: asList(parsed.Mood),
    releaseDate,
    year: releaseDate ? new Date(releaseDate).getUTCFullYear() : undefined,
    trackCount: parsed.TrackCount || 0,
    isFeatured: parsed.Featured || parsed.LibraryFeatured || false,
    artists: [],
    code: parsed.Code || parsed.CdCode || undefined,
    keywords: asList(parsed.Keywords),
    styles,
  };
}

export function mapPlaylist(item: HarvestRecord, templates: HarvestAssetTemplates): Playlist {
  const parsed: HarvestPlaylistPayload = HarvestPlaylistSchema.parse(item);
  const id = parsed.ID;
  return {
    id,
    slug: id,
    title: titleOf(parsed),
    description: parsed.Description || undefined,
    cover: templates.playlistArt
      ? assetUrl(templates.playlistArt, { id, width: 800, height: 800 })
      : "/images/placeholder-playlist.jpg",
    trackCount: parsed.TrackCount || parsed.Tracks.length,
    category: parsed.Type || parsed.Category || undefined,
    isFeatured: true,
    createdAt: asIsoDate(parsed.CreatedDate),
  };
}

export async function cloudSearch(input: HarvestSearchInput, authenticatedMemberToken?: string): Promise<{
  tracks: Track[];
  albums: Album[];
  total: number;
  facets: SearchFacets;
  searchHistoryId?: string;
}> {
  const regionId = input.regionId || await getRegionId();
  const requestBody = JSON.stringify(buildCloudSearch({
    ...input,
    regionId,
    saveSearchHistory: Boolean(authenticatedMemberToken && input.saveSearchHistory !== false),
    returnRates: Boolean(authenticatedMemberToken),
  }));
  const searchRequest = authenticatedMemberToken
    ? memberRequest<unknown>(authenticatedMemberToken, (token) => `/cloudsearch/${token}`, { method: "POST", body: requestBody }, 15_000)
    : guestRequest<unknown>((token) => `/cloudsearch/${token}`, { method: "POST", body: requestBody }, { timeoutMs: 15_000, regionId });
  const [unparsedPayload, templates] = await Promise.all([
    searchRequest,
    getAssetTemplates(),
  ]);
  const payload = HarvestSearchResponseSchema.parse(unparsedPayload);
  const trackItems = payload.Tracks;
  const albumItems = payload.Albums;
  const view = input.view ?? "Track";
  const total = view === "Album"
    ? payload.TotalAlbums
    : payload.TotalTracks;
  const searchHistoryId = searchHistoryIdFromResponse(payload);
  return {
    tracks: trackItems.map((item) => mapTrack(item, templates)),
    albums: albumItems.map((item) => mapAlbum(item, templates)),
    total,
    facets: mapSearchFacets(payload),
    searchHistoryId,
  };
}

export async function getTrack(id: string, authenticatedMemberToken?: string): Promise<Track> {
  const body = JSON.stringify({
    ReturnAlternateVersions: "true",
    ReturnAttributes: "true",
    ReturnCategories: "true",
    ReturnCategoryFacet: "true",
    ReturnCodes: "true",
    ReturnComposers: "true",
    ReturnRelatedTracks: "false",
    ReturnRightHolders: "true",
    GetMainVersionFromAlternate: "true",
    CuesheetOnlyCodesAndAttribute: "false",
    ReturnInactiveTracks: "false",
    ReturnRegionOnlyTracks: "false",
    Offset: "0",
    Limit: "1",
    track: [id],
  });
  const [payload, templates] = await Promise.all([
    authenticatedMemberToken
      ? memberRequest<HarvestRecord>(authenticatedMemberToken, (token) => `/gettracks/${token}`, { method: "POST", body })
      : guestRequest<HarvestRecord>((token) => `/gettracks/${token}`, { method: "POST", body }),
    getAssetTemplates(),
  ]);
  const item = recordArray(payload, "Tracks")[0];
  if (!item) throw new HarvestError("Track not found", "NOT_FOUND", 404);
  return mapTrack(item, templates, undefined, "track-detail");
}

export async function getAlbums(options: {
  limit?: number;
  offset?: number;
  label?: string;
  style?: string;
  category?: string;
  categories?: string[];
  query?: string;
  featured?: boolean;
  sort?: string;
} = {}): Promise<PaginatedResult<Album>> {
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);
  const templates = await getAssetTemplates();

  if (options.featured) {
    const featured = await guestRequest<HarvestRecord>((token) =>
      `/getfeaturedalbums/${token}/${limit}?returntrackcount=true&mainonly=true&sort=ReleaseDate_Desc`,
    );
    let items = recordArray(featured, "Albums");
    if (!items.length) {
      const latest = await guestRequest<HarvestRecord>((token) => `/getlatestalbums/${token}/${limit}`);
      items = recordArray(latest, "Albums");
    }
    return { items: items.map((item) => mapAlbum(item, templates)), total: items.length, page: 1, pageSize: limit };
  }

  const requestedCategories = options.categories?.length ? options.categories : options.category ? [options.category] : undefined;
  const result = await cloudSearch({
    view: "Album",
    skip: offset,
    limit,
    sort: options.sort === "title" ? "Name_Asc" : "ReleaseDate_Desc",
    query: options.query,
    labels: options.label ? [options.label] : undefined,
    styles: options.style ? [options.style] : undefined,
    categories: requestedCategories,
  });
  return { items: result.albums, total: result.total, page: Math.floor(offset / limit) + 1, pageSize: limit };
}

export async function getAlbum(id: string): Promise<{ album: Album & { tracks: Track[] }; similar: Album[] }> {
  const [detail, tracksPayload, templates] = await Promise.all([
    guestRequest<HarvestRecord>((token) => `/getalbum/${token}/${encodeURIComponent(id)}?returnLibraryCodes=false`),
    guestRequest<HarvestRecord>((token) =>
      `/getalbumtracks/${token}/${encodeURIComponent(id)}/mainonly?skip=0&limit=200`,
    ),
    getAssetTemplates(),
  ]);
  const rawAlbum = isRecord(detail.Album) ? detail.Album : undefined;
  if (!rawAlbum || !asString(rawAlbum.ID)) throw new HarvestError("Album not found", "NOT_FOUND", 404);
  const base = mapAlbum(rawAlbum, templates);
  const tracks = recordArray(tracksPayload, "Tracks").map((item) => mapTrack(item, templates, base, "album"));
  const related = await cloudSearch({
    view: "Album",
    limit: 7,
    labels: base.labelSlug ? [base.labelSlug] : undefined,
  }).catch(() => ({ albums: [] as Album[], tracks: [] as Track[], total: 0, facets: {
    bpm: { min: 1, max: 300 }, duration: { min: 1, max: 2029 }, labels: [], categories: [], styles: [],
  } }));
  return {
    album: { ...base, trackCount: tracks.length, tracks },
    similar: related.albums.filter((album) => album.id !== id).slice(0, 6),
  };
}

export async function getLabels(): Promise<Label[]> {
  const [payload, templates] = await Promise.all([
    guestRequest<HarvestRecord>((token) => `/getlibraries/${token}`),
    getAssetTemplates(),
  ]);
  return recordArray(payload, "Libraries")
    .map((item) => {
      const id = asString(item.ID);
      return {
        id,
        slug: id,
        name: asString(item.Name),
        logo: templates.libraryLogo
          ? assetUrl(templates.libraryLogo, { id, width: 640, height: 640 })
          : "/images/placeholder-label.jpg",
        description: asString(pick(item, "Detail", "Profile")) || undefined,
        website: asString(item.Website) || undefined,
        albumCount: asNumber(item.AlbumCount),
        location: asString(item.Location) || undefined,
        featured: asBoolean(item.Featured),
      } satisfies Label;
    })
    .filter((label) => label.id && label.name)
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export async function getLabel(id: string): Promise<Label | null> {
  const [payload, templates] = await Promise.all([
    guestRequest<HarvestRecord>((token) => `/getlibrary/${token}/${encodeURIComponent(id)}?returnCodes=true`),
    getAssetTemplates(),
  ]);
  const item = isRecord(payload.Library) ? payload.Library : undefined;
  if (!item) return null;
  const labels = await getLabels();
  const count = labels.find((label) => label.id === id)?.albumCount ?? 0;
  return {
    id,
    slug: id,
    name: asString(item.Name),
    logo: templates.libraryLogo
      ? assetUrl(templates.libraryLogo, { id, width: 800, height: 800 })
      : "/images/placeholder-label.jpg",
    description: asString(pick(item, "Detail", "Profile")) || undefined,
    website: asString(item.Website) || undefined,
    albumCount: count,
    location: asString(item.Location) || undefined,
    featured: asBoolean(item.Featured),
  };
}

export async function getPlaylists(options: { limit?: number; offset?: number; style?: string } = {}): Promise<PaginatedResult<Playlist>> {
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);
  const query = new URLSearchParams({
    showtrackcount: "true",
    skip: String(offset),
    limit: String(limit),
    languagecode: "en",
  });
  if (options.style) query.set("style", options.style);
  const [payload, templates] = await Promise.all([
    guestRequest<HarvestRecord>((token) => `/getfeaturedplaylistsplaylistonly/${token}?${query}`),
    getAssetTemplates(),
  ]);
  const items = recordArray(payload, "Playlists");
  return {
    items: items.map((item) => mapPlaylist(item, templates)),
    total: totalFrom(
      payload,
      offset + items.length + (items.length === limit ? 1 : 0),
      "TotalPlaylistsCount",
      "TotalCount",
    ),
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
  };
}

export async function getPlaylist(id: string): Promise<Playlist & { tracks: Track[] }> {
  const [payload, templates] = await Promise.all([
    guestRequest<HarvestRecord>(
      (token) => `/getfeaturedplaylistandtracks/${token}/${encodeURIComponent(id)}`,
      { method: "POST", body: "{}" },
      { timeoutMs: 15_000 },
    ),
    getAssetTemplates(),
  ]);
  const item = recordArray(payload, "Playlists")[0];
  if (!item) throw new HarvestError("Playlist not found", "NOT_FOUND", 404);
  const playlist = mapPlaylist(item, templates);
  const tracks = recordArray(item, "Tracks").map((track) => mapTrack(track, templates, undefined, "playlist"));
  return { ...playlist, trackCount: tracks.length, tracks };
}

export async function getCategories(language: "fr" | "en" = "en"): Promise<CatalogCategory[]> {
  const payload = await guestRequest<HarvestRecord>((token) =>
    `/getcategories/${token}/hasactivetrackonly?languagecode=${language}`,
  );
  const mapNode = (item: HarvestRecord, parentId?: string): CatalogCategory => {
    const id = asString(item.ID);
    return {
      id,
      name: asString(item.Name),
      slug: id,
      parentId,
      children: recordArray(item, "Attributes").map((child) => mapNode(child, id)),
    };
  };
  return recordArray(payload, "Categories").map((item) => mapNode(item));
}

export async function getStyles(): Promise<CatalogCategory[]> {
  const payload = await guestRequest<HarvestRecord>((token) =>
    `/getstyles/${token}?allowEmptyStyle=false`,
  );
  return recordArray(payload, "Styles").map((item) => ({
    id: asString(item.ID),
    name: asString(item.Name),
    slug: asString(item.ID),
  }));
}
