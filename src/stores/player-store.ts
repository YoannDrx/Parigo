"use client";

import { create } from "zustand";
import type { Track } from "@/types";

type RepeatMode = "off" | "track" | "queue";

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  queue: Track[];
  queueIndex: number;
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
  isQueueVisible: boolean;
  // History tracking
  listenStartTime: number | null;
  historyLogged: boolean;
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
  setRepeatMode: (mode: RepeatMode) => void;
  toggleShuffle: () => void;
  toggleQueue: () => void;
  logHistory: () => void;
}

type PlayerStore = PlayerState & PlayerActions;

// Helper to log history to API
const logHistoryToAPI = async (trackId: string, duration: number, completed: boolean) => {
  try {
    await fetch("/api/user/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId, duration, completed }),
    });
  } catch (error) {
    // Silently fail - history logging should not interrupt playback
    console.error("Failed to log history:", error);
  }
};

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  // State
  currentTrack: null,
  isPlaying: false,
  volume: 0.8,
  progress: 0,
  duration: 0,
  queue: [],
  queueIndex: 0,
  repeatMode: "off",
  shuffleEnabled: false,
  isQueueVisible: false,
  listenStartTime: null,
  historyLogged: false,

  // Actions
  play: (track: Track) => {
    const { queue, currentTrack, logHistory } = get();

    // Log history for previous track if applicable
    if (currentTrack && currentTrack.id !== track.id) {
      logHistory();
    }

    const trackIndex = queue.findIndex((t) => t.id === track.id);

    set({
      currentTrack: track,
      isPlaying: true,
      progress: 0,
      queueIndex: trackIndex >= 0 ? trackIndex : 0,
      listenStartTime: Date.now(),
      historyLogged: false,
    });
  },

  pause: () => set({ isPlaying: false }),

  resume: () => {
    const { listenStartTime } = get();
    set({
      isPlaying: true,
      // Reset start time if it was cleared
      listenStartTime: listenStartTime || Date.now(),
    });
  },

  toggle: () => {
    const { isPlaying, currentTrack } = get();
    if (currentTrack) {
      set({ isPlaying: !isPlaying });
    }
  },

  setVolume: (volume: number) => set({ volume: Math.max(0, Math.min(1, volume)) }),

  setProgress: (progress: number) => {
    const { historyLogged, currentTrack, duration } = get();

    // Log history after 30 seconds of listening
    if (!historyLogged && progress >= 30 && currentTrack) {
      set({ historyLogged: true });
      logHistoryToAPI(currentTrack.id, Math.floor(progress), progress >= duration * 0.9);
    }

    set({ progress });
  },

  setDuration: (duration: number) => set({ duration }),

  next: () => {
    const { queue, queueIndex, repeatMode, shuffleEnabled, logHistory, currentTrack } = get();
    if (queue.length === 0) return;

    // Log history for current track
    if (currentTrack) {
      logHistory();
    }

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
      listenStartTime: Date.now(),
      historyLogged: false,
    });
  },

  previous: () => {
    const { queue, queueIndex, progress, logHistory, currentTrack } = get();
    if (queue.length === 0) return;

    // Si on est au début de la piste (< 3s), aller à la précédente
    // Sinon, revenir au début de la piste actuelle
    if (progress < 3) {
      // Log history for current track
      if (currentTrack) {
        logHistory();
      }

      const prevIndex = queueIndex === 0 ? queue.length - 1 : queueIndex - 1;
      const prevTrack = queue[prevIndex];

      set({
        currentTrack: prevTrack,
        queueIndex: prevIndex,
        progress: 0,
        isPlaying: true,
        listenStartTime: Date.now(),
        historyLogged: false,
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
      listenStartTime: track ? Date.now() : null,
      historyLogged: false,
    });
  },

  clearQueue: () => {
    const { logHistory, currentTrack } = get();

    // Log history for current track before clearing
    if (currentTrack) {
      logHistory();
    }

    set({
      queue: [],
      queueIndex: 0,
      currentTrack: null,
      isPlaying: false,
      progress: 0,
      listenStartTime: null,
      historyLogged: false,
    });
  },

  setRepeatMode: (mode: RepeatMode) => set({ repeatMode: mode }),

  toggleShuffle: () => set((state) => ({ shuffleEnabled: !state.shuffleEnabled })),

  toggleQueue: () => set((state) => ({ isQueueVisible: !state.isQueueVisible })),

  logHistory: () => {
    const { currentTrack, progress, duration, historyLogged } = get();

    if (!currentTrack || historyLogged || progress < 10) return;

    // Log as completed if played more than 90% of the track
    const completed = duration > 0 && progress >= duration * 0.9;
    logHistoryToAPI(currentTrack.id, Math.floor(progress), completed);

    set({ historyLogged: true });
  },
}));
