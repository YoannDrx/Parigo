/**
 * API Client for fetching data from our backend
 */

import type { Album, CatalogCategory, Label, Playlist, SearchFacets, SearchFilterGroup, Track } from "@/types";

const API_BASE = "/api";

// Types for API responses
export type ApiAlbum = Album;
export type ApiTrack = Track;
export type ApiLabel = Label;
export type ApiPlaylist = Playlist;

export interface ApiGenre {
  id: string;
  name: string;
  slug: string;
  color?: string;
}

export interface ApiMood {
  id: string;
  name: string;
  slug: string;
  color?: string;
}

export interface ApiInstrument {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

export interface PaginatedResponse {
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface SearchApiResponse<T extends Track | Album> {
  data: { items: T[]; view: "tracks" | "albums"; facets: SearchFacets };
  meta: { page: number; pageSize: number; total: number; requestId: string };
}

// API Functions

export async function fetchAlbums(params?: {
  limit?: number;
  offset?: number;
  label?: string;
  genre?: string;
  genres?: string[];
  moods?: string[];
  instruments?: string[];
  query?: string;
  featured?: boolean;
  sort?: "order" | "releaseDate" | "title" | "relevance" | "recent" | "oldest" | "title-desc" | "bpm-asc" | "bpm-desc" | "duration-asc" | "duration-desc";
  forceSearch?: boolean;
  styles?: string[];
  categories?: string[];
  labels?: string[];
  type?: "main" | "alternate" | "all";
  language?: "fr" | "en";
  minBpm?: number;
  maxBpm?: number;
  minDuration?: number;
  maxDuration?: number;
}, signal?: AbortSignal): Promise<{ albums: ApiAlbum[]; facets?: SearchFacets } & PaginatedResponse> {
  const usesSearch = Boolean(params?.forceSearch || params?.query || params?.genres?.length || params?.moods?.length || params?.instruments?.length || params?.styles?.length || params?.categories?.length || params?.labels?.length || params?.minBpm || params?.maxBpm || params?.minDuration || params?.maxDuration);
  if (usesSearch) {
    const searchParams = new URLSearchParams({
      view: "albums",
      page: String(Math.floor((params?.offset || 0) / (params?.limit || 30)) + 1),
      limit: String(params?.limit || 30),
      sort: params?.sort && !["order", "releaseDate"].includes(params.sort) ? params.sort : "recent",
    });
    if (params?.query) searchParams.set("q", params.query);
    const labels = [...(params?.labels || []), ...(params?.label ? [params.label] : [])];
    if (labels.length) searchParams.set("labels", [...new Set(labels)].join(","));
    const categories = [...(params?.genres || []), ...(params?.moods || []), ...(params?.instruments || []), ...(params?.categories || [])];
    if (categories.length) searchParams.set("categories", categories.join(","));
    if (params?.styles?.length) searchParams.set("styles", params.styles.join(","));
    if (params?.type) searchParams.set("type", params.type);
    if (params?.language) searchParams.set("language", params.language);
    if (params?.minBpm !== undefined) searchParams.set("bpmMin", String(params.minBpm));
    if (params?.maxBpm !== undefined) searchParams.set("bpmMax", String(params.maxBpm));
    if (params?.minDuration !== undefined) searchParams.set("durationMin", String(params.minDuration));
    if (params?.maxDuration !== undefined) searchParams.set("durationMax", String(params.maxDuration));
    const response = await fetch(`${API_BASE}/search?${searchParams}`, { signal });
    if (!response.ok) throw new Error("Failed to search albums");
    const payload = await response.json() as SearchApiResponse<Album>;
    return {
      albums: payload.data.items,
      facets: payload.data.facets,
      pagination: { total: payload.meta.total, limit: payload.meta.pageSize, offset: (payload.meta.page - 1) * payload.meta.pageSize, hasMore: payload.meta.page * payload.meta.pageSize < payload.meta.total },
    };
  }
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());
  if (params?.label) searchParams.set("label", params.label);
  if (params?.genre) searchParams.set("genre", params.genre);
  if (params?.genres?.length) searchParams.set("genres", params.genres.join(","));
  if (params?.moods?.length) searchParams.set("moods", params.moods.join(","));
  if (params?.instruments?.length) searchParams.set("instruments", params.instruments.join(","));
  if (params?.query) searchParams.set("q", params.query);
  if (params?.featured) searchParams.set("featured", "true");
  if (params?.sort) searchParams.set("sort", params.sort);

  const res = await fetch(`${API_BASE}/albums?${searchParams}`, { signal });
  if (!res.ok) throw new Error("Failed to fetch albums");
  const payload = await res.json() as { data: { albums: Album[] }; meta: { total: number; page: number; pageSize: number } };
  return { albums: payload.data.albums, pagination: { total: payload.meta.total, limit: payload.meta.pageSize, offset: (payload.meta.page - 1) * payload.meta.pageSize, hasMore: payload.meta.page * payload.meta.pageSize < payload.meta.total } };
}

export async function fetchAlbum(idOrSlug: string): Promise<{
  album: ApiAlbum & { tracks: ApiTrack[] };
  similarAlbums: ApiAlbum[];
}> {
  const res = await fetch(`${API_BASE}/albums/${idOrSlug}`);
  if (!res.ok) throw new Error("Failed to fetch album");
  const payload = await res.json() as { data: { album: ApiAlbum & { tracks: ApiTrack[] }; similarAlbums: ApiAlbum[] } };
  return payload.data;
}

export async function fetchTracks(params?: {
  limit?: number;
  offset?: number;
  albumId?: string;
  query?: string;
  genre?: string;
  genres?: string[];
  mood?: string;
  moods?: string[];
  instrument?: string;
  instruments?: string[];
  minBpm?: number;
  maxBpm?: number;
  minDuration?: number;
  maxDuration?: number;
  isVocal?: boolean;
  label?: string;
  labels?: string[];
  styles?: string[];
  categories?: string[];
  type?: "main" | "alternate" | "all";
  language?: "fr" | "en";
  sort?: "relevance" | "recent" | "oldest" | "title" | "title-desc" | "bpm-asc" | "bpm-desc" | "duration-asc" | "duration-desc";
}, signal?: AbortSignal): Promise<{ tracks: ApiTrack[]; facets?: SearchFacets } & PaginatedResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());
  if (params?.albumId) searchParams.set("albumId", params.albumId);
  if (params?.albumId) {
    const res = await fetch(`${API_BASE}/tracks?${searchParams}`, { signal });
    if (!res.ok) throw new Error("Failed to fetch album tracks");
    return res.json();
  }
  searchParams.set("view", "tracks");
  searchParams.set("page", String(Math.floor((params?.offset || 0) / (params?.limit || 30)) + 1));
  if (params?.query) searchParams.set("q", params.query);
  const categories = [params?.genre, params?.mood, params?.instrument, ...(params?.genres || []), ...(params?.moods || []), ...(params?.instruments || []), ...(params?.categories || [])].filter(Boolean) as string[];
  if (categories.length) searchParams.set("categories", [...new Set(categories)].join(","));
  if (params?.styles?.length) searchParams.set("styles", params.styles.join(","));
  if (params?.minBpm) searchParams.set("bpmMin", params.minBpm.toString());
  if (params?.maxBpm) searchParams.set("bpmMax", params.maxBpm.toString());
  if (params?.minDuration) searchParams.set("durationMin", params.minDuration.toString());
  if (params?.maxDuration) searchParams.set("durationMax", params.maxDuration.toString());
  const labels = [...(params?.labels || []), ...(params?.label ? [params.label] : [])];
  if (labels.length) searchParams.set("labels", [...new Set(labels)].join(","));
  if (params?.sort) searchParams.set("sort", params.sort);
  if (params?.type) searchParams.set("type", params.type);
  if (params?.language) searchParams.set("language", params.language);

  const res = await fetch(`${API_BASE}/search?${searchParams}`, { signal });
  if (!res.ok) throw new Error("Failed to fetch tracks");
  const payload = await res.json() as SearchApiResponse<Track>;
  return {
    tracks: payload.data.items,
    facets: payload.data.facets,
    pagination: { total: payload.meta.total, limit: payload.meta.pageSize, offset: (payload.meta.page - 1) * payload.meta.pageSize, hasMore: payload.meta.page * payload.meta.pageSize < payload.meta.total },
  };
}

export async function searchAll(query: string, type?: "all" | "albums" | "tracks"): Promise<{
  albums: ApiAlbum[];
  tracks: ApiTrack[];
  total: number;
  query: string;
}> {
  const view = type === "albums" ? "albums" : "tracks";
  const searchParams = new URLSearchParams({ q: query, view });

  const res = await fetch(`${API_BASE}/search?${searchParams}`);
  if (!res.ok) throw new Error("Failed to search");
  const payload = await res.json() as SearchApiResponse<Track | Album>;
  return {
    albums: view === "albums" ? payload.data.items as Album[] : [],
    tracks: view === "tracks" ? payload.data.items as Track[] : [],
    total: payload.meta.total,
    query,
  };
}

export async function fetchLabels(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ labels: ApiLabel[] } & PaginatedResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());

  const res = await fetch(`${API_BASE}/labels?${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch labels");
  const payload = await res.json() as { data: { labels: Label[] }; meta: { total: number; page: number; pageSize: number } };
  return { labels: payload.data.labels, pagination: { total: payload.meta.total, limit: payload.meta.pageSize, offset: (payload.meta.page - 1) * payload.meta.pageSize, hasMore: payload.meta.page * payload.meta.pageSize < payload.meta.total } };
}

export async function fetchPlaylists(params?: {
  limit?: number;
  offset?: number;
  category?: string;
  featured?: boolean;
}): Promise<{ playlists: ApiPlaylist[] } & PaginatedResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());
  if (params?.category) searchParams.set("category", params.category);
  if (params?.featured) searchParams.set("featured", "true");

  const res = await fetch(`${API_BASE}/playlists?${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch playlists");
  const payload = await res.json() as { data: { playlists: Playlist[] }; meta: { total: number; page: number; pageSize: number } };
  return { playlists: payload.data.playlists, pagination: { total: payload.meta.total, limit: payload.meta.pageSize, offset: (payload.meta.page - 1) * payload.meta.pageSize, hasMore: payload.meta.page * payload.meta.pageSize < payload.meta.total } };
}

export async function fetchGenres(): Promise<{ genres: ApiGenre[] }> {
  const res = await fetch(`${API_BASE}/genres`);
  if (!res.ok) throw new Error("Failed to fetch genres");
  return res.json();
}

export async function fetchMoods(): Promise<{ moods: ApiMood[] }> {
  const res = await fetch(`${API_BASE}/moods`);
  if (!res.ok) throw new Error("Failed to fetch moods");
  return res.json();
}

export async function fetchInstruments(): Promise<{ instruments: ApiInstrument[] }> {
  const res = await fetch(`${API_BASE}/instruments`);
  if (!res.ok) throw new Error("Failed to fetch instruments");
  return res.json();
}

export async function fetchCategoryGroups(language: "fr" | "en"): Promise<CatalogCategory[]> {
  const response = await fetch(`${API_BASE}/categories?language=${language}`);
  if (!response.ok) throw new Error("Failed to fetch Harvest category groups");
  const payload = await response.json() as { data: { groups: CatalogCategory[] } };
  return payload.data.groups;
}

export async function fetchSearchFilters(language: "fr" | "en", signal?: AbortSignal): Promise<SearchFilterGroup[]> {
  const response = await fetch(`${API_BASE}/search/filters?language=${language}`, { signal });
  if (!response.ok) throw new Error("Failed to fetch search filters");
  const payload = await response.json() as { data: { groups: SearchFilterGroup[] } };
  return payload.data.groups;
}

export async function fetchStyles(): Promise<CatalogCategory[]> {
  const response = await fetch(`${API_BASE}/collections`);
  if (!response.ok) throw new Error("Failed to fetch Harvest styles");
  const payload = await response.json() as { data: { collections: CatalogCategory[] } };
  return payload.data.collections;
}
