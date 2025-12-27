export interface Track {
  id: string;
  title: string;
  duration: number;
  bpm: number;
  audioUrl: string;
  albumId: string;
  genres: string[];
  moods: string[];
  instruments: string[];
  isVocal: boolean;
}

export interface Album {
  id: string;
  title: string;
  label: string;
  cover: string;
  description: string;
  tracks: Track[];
  genres: string[];
  moods: string[];
  releaseDate: string;
  trackCount: number;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  cover: string;
  trackIds: string[];
  category: string;
}

export interface Label {
  id: string;
  name: string;
  logo: string;
  description: string;
  albumCount: number;
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
