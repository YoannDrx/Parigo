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
