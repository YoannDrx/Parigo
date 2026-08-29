import { create } from "zustand";

export interface TrackShareTarget {
  trackId: string;
  title: string;
  description?: string;
  albumSlug: string;
}

interface TrackShareState {
  target: TrackShareTarget | null;
  open: (target: TrackShareTarget) => void;
  close: () => void;
}

export const useTrackShareStore = create<TrackShareState>((set) => ({
  target: null,
  open: (target) => set({ target }),
  close: () => set({ target: null }),
}));
