/**
 * API Client for fetching data from our backend
 */

const API_BASE = "/api";

// Types for API responses
export interface ApiAlbum {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover: string;
  coverBlur?: string;
  label: string;
  labelSlug?: string;
  releaseDate?: string;
  year?: number;
  spotifyUrl?: string;
  genres: Array<{ name: string; slug: string; color?: string }>;
  moods: Array<{ name: string; slug: string; color?: string }>;
  artists: Array<{ name: string; slug: string; role?: string }>;
  trackCount: number;
  isFeatured?: boolean;
}

export interface ApiTrack {
  id: string;
  slug: string;
  title: string;
  duration: number;
  bpm?: number;
  key?: string;
  isVocal: boolean;
  audioUrl: string | null;
  waveform: number[] | null;
  trackNumber?: number;
  albumId: string;
  albumTitle: string;
  albumSlug: string;
  albumCover: string;
  albumLabel?: string;
  albumLabelSlug?: string;
  genres: string[];
  moods: string[];
  instruments?: string[];
  artists?: Array<{ name: string; slug: string }>;
}

export interface ApiArtist {
  id: string;
  slug: string;
  name: string;
  bio?: string;
  image: string;
  links: Array<{ platform: string; url: string; label?: string }>;
  albumCount: number;
  trackCount: number;
}

export interface ApiLabel {
  id: string;
  slug: string;
  name: string;
  description?: string;
  logo: string;
  website?: string;
  albumCount: number;
}

export interface ApiPlaylist {
  id: string;
  slug: string;
  title: string;
  description?: string;
  cover: string;
  category?: string;
  trackCount: number;
  isFeatured?: boolean;
}

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

export interface PaginatedResponse<T> {
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// API Functions

export async function fetchAlbums(params?: {
  limit?: number;
  offset?: number;
  label?: string;
  genre?: string;
  featured?: boolean;
  sort?: "order" | "releaseDate" | "title";
}): Promise<{ albums: ApiAlbum[] } & PaginatedResponse<ApiAlbum>> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());
  if (params?.label) searchParams.set("label", params.label);
  if (params?.genre) searchParams.set("genre", params.genre);
  if (params?.featured) searchParams.set("featured", "true");
  if (params?.sort) searchParams.set("sort", params.sort);

  const res = await fetch(`${API_BASE}/albums?${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch albums");
  return res.json();
}

export async function fetchAlbum(idOrSlug: string): Promise<{
  album: ApiAlbum & { tracks: ApiTrack[] };
  similarAlbums: ApiAlbum[];
}> {
  const res = await fetch(`${API_BASE}/albums/${idOrSlug}`);
  if (!res.ok) throw new Error("Failed to fetch album");
  return res.json();
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
  sort?: "relevance" | "recent" | "title" | "bpm-asc" | "bpm-desc" | "duration-asc" | "duration-desc";
}): Promise<{ tracks: ApiTrack[] } & PaginatedResponse<ApiTrack>> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());
  if (params?.albumId) searchParams.set("albumId", params.albumId);
  if (params?.query) searchParams.set("q", params.query);
  if (params?.genre) searchParams.set("genre", params.genre);
  if (params?.genres?.length) searchParams.set("genres", params.genres.join(","));
  if (params?.mood) searchParams.set("mood", params.mood);
  if (params?.moods?.length) searchParams.set("moods", params.moods.join(","));
  if (params?.instrument) searchParams.set("instrument", params.instrument);
  if (params?.instruments?.length) searchParams.set("instruments", params.instruments.join(","));
  if (params?.minBpm) searchParams.set("minBpm", params.minBpm.toString());
  if (params?.maxBpm) searchParams.set("maxBpm", params.maxBpm.toString());
  if (params?.minDuration) searchParams.set("minDuration", params.minDuration.toString());
  if (params?.maxDuration) searchParams.set("maxDuration", params.maxDuration.toString());
  if (params?.isVocal !== undefined) searchParams.set("isVocal", params.isVocal.toString());
  if (params?.label) searchParams.set("label", params.label);
  if (params?.sort) searchParams.set("sort", params.sort);

  const res = await fetch(`${API_BASE}/tracks?${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch tracks");
  return res.json();
}

export async function searchAll(query: string, type?: "all" | "albums" | "tracks" | "artists"): Promise<{
  albums: ApiAlbum[];
  tracks: ApiTrack[];
  artists: ApiArtist[];
  total: number;
  query: string;
}> {
  const searchParams = new URLSearchParams({ q: query });
  if (type) searchParams.set("type", type);

  const res = await fetch(`${API_BASE}/search?${searchParams}`);
  if (!res.ok) throw new Error("Failed to search");
  return res.json();
}

export async function fetchArtists(params?: {
  limit?: number;
  offset?: number;
  letter?: string;
}): Promise<{ artists: ApiArtist[] } & PaginatedResponse<ApiArtist>> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());
  if (params?.letter) searchParams.set("letter", params.letter);

  const res = await fetch(`${API_BASE}/artists?${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch artists");
  return res.json();
}

export async function fetchLabels(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ labels: ApiLabel[] } & PaginatedResponse<ApiLabel>> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());

  const res = await fetch(`${API_BASE}/labels?${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch labels");
  return res.json();
}

export async function fetchPlaylists(params?: {
  limit?: number;
  offset?: number;
  category?: string;
  featured?: boolean;
}): Promise<{ playlists: ApiPlaylist[] } & PaginatedResponse<ApiPlaylist>> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());
  if (params?.category) searchParams.set("category", params.category);
  if (params?.featured) searchParams.set("featured", "true");

  const res = await fetch(`${API_BASE}/playlists?${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch playlists");
  return res.json();
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
