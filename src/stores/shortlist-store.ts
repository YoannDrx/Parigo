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
  setOpen: (open: boolean) => void;
}

export const useShortlistStore = create<ShortlistState>()(persist((set) => ({
  items: [],
  isOpen: false,
  add: (track) => set((state) => state.items.some((item) => item.track.id === track.id)
    ? { isOpen: true }
    : { items: [...state.items, { track, addedAt: new Date().toISOString() }], isOpen: true }),
  remove: (trackId) => set((state) => ({ items: state.items.filter((item) => item.track.id !== trackId) })),
  clear: () => set({ items: [] }),
  setOpen: (isOpen) => set({ isOpen }),
}), { name: "parigo-shortlist", partialize: (state) => ({ items: state.items }) }));
