export interface Track {
  id: string;
  slug?: string;
  title: string;
  duration: number;
  bpm?: number | null;
  key?: string | null;
  audioUrl: string | null;
  albumId: string;
  albumTitle?: string;
  albumSlug?: string;
  albumCover?: string;
  albumLabel?: string;
  albumLabelSlug?: string;
  genres: string[];
  moods: string[];
  instruments?: string[];
  isVocal: boolean;
  /** Pre-generated waveform data (array of 0-1 values) */
  waveform: number[] | null;
  trackNumber?: number;
  artists?: Array<{ name: string; slug: string }>;
}

export interface Album {
  id: string;
  slug?: string;
  title: string;
  label: string;
  labelSlug?: string;
  cover: string;
  coverBlur?: string;
  description?: string | null;
  tracks?: Track[];
  genres: string[];
  moods?: string[];
  releaseDate?: string;
  year?: number;
  spotifyUrl?: string;
  trackCount: number;
  isFeatured?: boolean;
  artists?: Array<{ name: string; slug: string; role?: string }>;
}

export interface Playlist {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  cover: string;
  trackIds?: string[];
  trackCount?: number;
  category?: string;
  isFeatured?: boolean;
}

export interface Artist {
  id: string;
  slug: string;
  name: string;
  bio?: string;
  image: string;
  links?: Array<{ platform: string; url: string; label?: string }>;
  albumCount: number;
  trackCount: number;
}

export interface Label {
  id: string;
  slug?: string;
  name: string;
  logo: string;
  description?: string;
  website?: string;
  albumCount: number;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
  color?: string;
}

export interface Mood {
  id: string;
  name: string;
  slug: string;
  color?: string;
}

export type ViewMode = "grid" | "list";

export interface FilterState {
  genres: string[];
  moods: string[];
  bpmRange: [number, number];
  durationRange: [number, number];
  instruments: string[];
  isVocal: boolean | null;
  searchQuery: string;
}

export type MediaKind = "album" | "synchro" | "artist" | "label";

export interface MediaCredit {
  src: string;
  source: string;
  kind: MediaKind;
  title: string;
  mock: boolean;
}

export interface SearchIntent {
  raw: string;
  freeText: string;
  genres: string[];
  moods: string[];
  instruments: string[];
  bpmRange: [number, number] | null;
  isVocal: boolean | null;
}

export interface CatalogQuery extends Partial<FilterState> {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ShortlistItem {
  track: Track;
  addedAt: string;
}

export type CatalogTrack = Track;
export type CatalogAlbum = Album;
export interface CatalogAlbumDetail extends Album { tracks: Track[]; }
export type CatalogPlaylist = Playlist;
export type CatalogArtist = Artist;
export type CatalogLabel = Label;

export interface CatalogAdapter {
  search(query: CatalogQuery): Promise<PaginatedResult<CatalogTrack>>;
  getAlbums(query?: CatalogQuery): Promise<PaginatedResult<CatalogAlbum>>;
  getAlbum(slug: string): Promise<CatalogAlbumDetail | null>;
  getPlaylists(query?: CatalogQuery): Promise<PaginatedResult<CatalogPlaylist>>;
  getArtists(query?: CatalogQuery): Promise<PaginatedResult<CatalogArtist>>;
  getLabels(query?: CatalogQuery): Promise<PaginatedResult<CatalogLabel>>;
}
