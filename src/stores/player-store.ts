"use client";

import { create } from "zustand";
import type { Track } from "@/types";

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  queue: Track[];
  queueIndex: number;
}

interface PlayerActions {
  play: (track: Track) => void;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  next: () => void;
  previous: () => void;
  addToQueue: (track: Track) => void;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  clearQueue: () => void;
}

type PlayerStore = PlayerState & PlayerActions;

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  // State
  currentTrack: null,
  isPlaying: false,
  volume: 0.8,
  progress: 0,
  duration: 0,
  queue: [],
  queueIndex: 0,

  // Actions
  play: (track: Track) => {
    const { queue } = get();
    const trackIndex = queue.findIndex((t) => t.id === track.id);

    set({
      currentTrack: track,
      isPlaying: true,
      progress: 0,
      queueIndex: trackIndex >= 0 ? trackIndex : 0,
    });
  },

  pause: () => set({ isPlaying: false }),

  resume: () => set({ isPlaying: true }),

  toggle: () => {
    const { isPlaying, currentTrack } = get();
    if (currentTrack) {
      set({ isPlaying: !isPlaying });
    }
  },

  setVolume: (volume: number) => set({ volume: Math.max(0, Math.min(1, volume)) }),

  setProgress: (progress: number) => set({ progress }),

  setDuration: (duration: number) => set({ duration }),

  next: () => {
    const { queue, queueIndex } = get();
    if (queue.length === 0) return;

    const nextIndex = (queueIndex + 1) % queue.length;
    const nextTrack = queue[nextIndex];

    set({
      currentTrack: nextTrack,
      queueIndex: nextIndex,
      progress: 0,
      isPlaying: true,
    });
  },

  previous: () => {
    const { queue, queueIndex, progress } = get();
    if (queue.length === 0) return;

    // Si on est au début de la piste (< 3s), aller à la précédente
    // Sinon, revenir au début de la piste actuelle
    if (progress < 3) {
      const prevIndex = queueIndex === 0 ? queue.length - 1 : queueIndex - 1;
      const prevTrack = queue[prevIndex];

      set({
        currentTrack: prevTrack,
        queueIndex: prevIndex,
        progress: 0,
        isPlaying: true,
      });
    } else {
      set({ progress: 0 });
    }
  },

  addToQueue: (track: Track) => {
    set((state) => ({
      queue: [...state.queue, track],
    }));
  },

  setQueue: (tracks: Track[], startIndex = 0) => {
    const track = tracks[startIndex];
    set({
      queue: tracks,
      queueIndex: startIndex,
      currentTrack: track || null,
      progress: 0,
    });
  },

  clearQueue: () => {
    set({
      queue: [],
      queueIndex: 0,
      currentTrack: null,
      isPlaying: false,
      progress: 0,
    });
  },
}));
