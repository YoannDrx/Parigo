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
  composers?: string[];
  publishers?: string[];
  version?: string;
  isAlternate?: boolean;
  alternateCount?: number;
  stemCount?: number;
  isrc?: string;
  mainTrackId?: string;
  description?: string;
  lyrics?: string;
  cdCode?: string;
  tags?: string[];
  keywords?: string[];
  musicFor?: string[];
  rightHolders?: Array<{ id: string; name: string; capacity?: string }>;
  stems?: Array<{ id: string; title?: string }>;
  alternateTracks?: Track[];
  rate?: Record<string, unknown> | null;
  isExplicit?: boolean;
  libraryType?: string;
  highlighted?: boolean;
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
  code?: string;
  keywords?: string[];
  styles?: Array<{ id: string; name: string }>;
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
  tracks?: Track[];
  createdAt?: string;
}

export interface Label {
  id: string;
  slug?: string;
  name: string;
  logo: string;
  description?: string;
  website?: string;
  albumCount: number;
  location?: string;
  featured?: boolean;
}

export interface CatalogCategory {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  children?: CatalogCategory[];
}

export interface SearchFacetItem {
  id: string;
  name: string;
  count: number;
  parentId?: string;
}

export interface SearchFacets {
  bpm: { min: number; max: number };
  duration: { min: number; max: number };
  labels: SearchFacetItem[];
  categories: SearchFacetItem[];
  styles: SearchFacetItem[];
}

export type SearchFilterGroupKey =
  | "labels"
  | "genre"
  | "moods"
  | "musicFor"
  | "period"
  | "instruments"
  | "area"
  | "styles";

export interface SearchFilterItem {
  id: string;
  name: string;
  count?: number;
  parentId?: string;
  children?: SearchFilterItem[];
}

export interface SearchFilterGroup {
  key: SearchFilterGroupKey;
  label: string;
  selection: "include-only" | "include-exclude";
  total: number;
  available: number;
  items: SearchFilterItem[];
}

export interface MemberProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  verified?: boolean;
  subscribed?: boolean;
  username?: string;
  country?: string;
  production?: string;
  subProduction?: string;
  position?: string;
  address1?: string;
  address2?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  phone?: string;
  status?: "unverified" | "pending" | "active" | "blocked" | "disabled" | string;
  regionId?: string;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
  fileFormatId?: string;
  fileFormats?: Array<{ id: string; label: string; extension?: string }>;
  downloadEnabled?: boolean;
  downloadEnabledType?: string;
  downloadLimit?: number;
  downloadsUsed?: number;
  downloadsRemaining?: number;
  downloadStem?: boolean;
  sampleEnabled?: boolean;
  hasProfileImage?: boolean;
  website?: string;
  positionType?: string;
  freelancer?: boolean;
  managedBy?: { name: string; email?: string; phone?: string };
}

export interface MemberTag {
  id: string;
  name: string;
  color?: string;
  trackCount: number;
  createdAt?: string;
}

export interface DownloadJob {
  requested: boolean;
  token?: string;
  blockedContentIds: string[];
  files?: Array<{ name: string; url: string; status?: string }>;
}

export interface ApiError {
  code:
    | "VALIDATION_FAILED"
    | "UNAUTHENTICATED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "RATE_LIMITED"
    | "CATALOG_UNAVAILABLE"
    | "ACCOUNT_UNAVAILABLE"
    | "INVALID_UPSTREAM_RESPONSE";
  message: string;
  retryable: boolean;
  requestId: string;
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

export type MediaKind = "album" | "synchro" | "label";

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
export type CatalogLabel = Label;

export interface CatalogAdapter {
  search(query: CatalogQuery): Promise<PaginatedResult<CatalogTrack>>;
  getAlbums(query?: CatalogQuery): Promise<PaginatedResult<CatalogAlbum>>;
  getAlbum(slug: string): Promise<CatalogAlbumDetail | null>;
  getPlaylists(query?: CatalogQuery): Promise<PaginatedResult<CatalogPlaylist>>;
  getLabels(query?: CatalogQuery): Promise<PaginatedResult<CatalogLabel>>;
}
