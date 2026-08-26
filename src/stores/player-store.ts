"use client";

import { create } from "zustand";
import type { Track } from "@/types";

type RepeatMode = "off" | "track" | "queue";

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  seekRevision: number;
  duration: number;
  queue: Track[];
  queueIndex: number;
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
  isQueueVisible: boolean;
}

interface PlayerActions {
  play: (track: Track) => void;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  seekTo: (progress: number) => void;
  setDuration: (duration: number) => void;
  next: () => void;
  previous: () => void;
  addToQueue: (track: Track) => void;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  clearQueue: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  toggleShuffle: () => void;
  toggleQueue: () => void;
}

type PlayerStore = PlayerState & PlayerActions;

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  // State
  currentTrack: null,
  isPlaying: false,
  volume: 0.8,
  progress: 0,
  seekRevision: 0,
  duration: 0,
  queue: [],
  queueIndex: 0,
  repeatMode: "off",
  shuffleEnabled: false,
  isQueueVisible: false,

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

  seekTo: (progress: number) => set((state) => ({
    progress: Math.max(0, progress),
    seekRevision: state.seekRevision + 1,
  })),

  setDuration: (duration: number) => set({ duration }),

  next: () => {
    const { queue, queueIndex, repeatMode, shuffleEnabled } = get();
    if (queue.length === 0) return;

    let nextIndex: number;

    if (repeatMode === "track") {
      // Repeat current track
      nextIndex = queueIndex;
    } else if (shuffleEnabled) {
      // Random next track (avoiding current if possible)
      do {
        nextIndex = Math.floor(Math.random() * queue.length);
      } while (nextIndex === queueIndex && queue.length > 1);
    } else {
      nextIndex = (queueIndex + 1) % queue.length;

      // If repeat is off and we're at the end, stop
      if (repeatMode === "off" && nextIndex === 0) {
        set({ isPlaying: false, progress: 0 });
        return;
      }
    }

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
      set((state) => ({ progress: 0, seekRevision: state.seekRevision + 1 }));
    }
  },

  addToQueue: (track: Track) => {
    set((state) => ({
      queue: [...state.queue, track],
    }));
  },

  setQueue: (tracks: Track[], startIndex = 0) => {
    const { shuffleEnabled } = get();
    let finalTracks = tracks;
    let finalIndex = startIndex;

    // If shuffle is enabled, shuffle the queue but keep the selected track first
    if (shuffleEnabled && tracks.length > 1) {
      const selectedTrack = tracks[startIndex];
      const otherTracks = tracks.filter((_, i) => i !== startIndex);

      // Fisher-Yates shuffle for other tracks
      for (let i = otherTracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otherTracks[i], otherTracks[j]] = [otherTracks[j], otherTracks[i]];
      }

      finalTracks = [selectedTrack, ...otherTracks];
      finalIndex = 0;
    }

    const track = finalTracks[finalIndex];
    set({
      queue: finalTracks,
      queueIndex: finalIndex,
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

  setRepeatMode: (mode: RepeatMode) => set({ repeatMode: mode }),

  toggleShuffle: () => set((state) => ({ shuffleEnabled: !state.shuffleEnabled })),

  toggleQueue: () => set((state) => ({ isQueueVisible: !state.isQueueVisible })),
}));
