"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ShortlistItem, Track } from "@/types";

interface ShortlistState {
  items: ShortlistItem[];
  isOpen: boolean;
  add: (track: Track) => void;
  remove: (trackId: string) => void;
  clear: () => void;
  move: (trackId: string, direction: -1 | 1) => void;
  setOpen: (open: boolean) => void;
}

export function isLegacyDemoTrack(track: Track): boolean {
  const title = track.title.trim().toLocaleLowerCase();
  const sources = [track.albumTitle, track.albumLabel, ...(track.artists?.map((artist) => artist.name) ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
  return title === "track 1" && sources.includes("acide");
}

export const useShortlistStore = create<ShortlistState>()(persist((set) => ({
  items: [],
  isOpen: false,
  add: (track) => set((state) => state.items.some((item) => item.track.id === track.id)
    ? { isOpen: true }
    : { items: [...state.items, { track, addedAt: new Date().toISOString() }], isOpen: true }),
  remove: (trackId) => set((state) => ({ items: state.items.filter((item) => item.track.id !== trackId) })),
  clear: () => set({ items: [] }),
  move: (trackId, direction) => set((state) => {
    const index = state.items.findIndex((item) => item.track.id === trackId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= state.items.length) return state;
    const items = [...state.items];
    [items[index], items[target]] = [items[target], items[index]];
    return { items };
  }),
  setOpen: (isOpen) => set({ isOpen }),
}), {
  name: "parigo-shortlist",
  version: 2,
  migrate: (persistedState) => {
    const state = persistedState as { items?: ShortlistItem[] };
    return { ...state, items: (state.items ?? []).filter((item) => !isLegacyDemoTrack(item.track)) };
  },
  partialize: (state) => ({ items: state.items }),
}));
