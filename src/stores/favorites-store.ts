"use client";

import { create } from "zustand";

interface FavoritesState {
  trackIds: Set<string>;
  albumIds: Set<string>;
  playlistIds: Set<string>;
  isLoading: boolean;
  isLoaded: boolean;

  // Actions
  loadFavorites: () => Promise<void>;
  addFavoriteTrack: (trackId: string) => Promise<void>;
  removeFavoriteTrack: (trackId: string) => Promise<void>;
  toggleFavoriteTrack: (trackId: string) => Promise<void>;
  addFavoriteAlbum: (albumId: string) => Promise<void>;
  removeFavoriteAlbum: (albumId: string) => Promise<void>;
  toggleFavoriteAlbum: (albumId: string) => Promise<void>;
  addFavoritePlaylist: (playlistId: string) => Promise<void>;
  removeFavoritePlaylist: (playlistId: string) => Promise<void>;
  toggleFavoritePlaylist: (playlistId: string) => Promise<void>;
  isTrackFavorite: (trackId: string) => boolean;
  isAlbumFavorite: (albumId: string) => boolean;
  isPlaylistFavorite: (playlistId: string) => boolean;
  clearFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  trackIds: new Set(),
  albumIds: new Set(),
  playlistIds: new Set(),
  isLoading: false,
  isLoaded: false,

  loadFavorites: async () => {
    if (get().isLoading || get().isLoaded) return;

    set({ isLoading: true });
    try {
      const response = await fetch("/api/user/favorites");
      if (response.ok) {
        const data = await response.json();
        set({
          trackIds: new Set(data.trackIds),
          albumIds: new Set(data.albumIds),
          playlistIds: new Set(data.playlistIds),
          isLoaded: true,
        });
      }
    } catch (error) {
      console.error("Failed to load favorites:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  addFavoriteTrack: async (trackId: string) => {
    // Optimistic update
    set((state) => ({
      trackIds: new Set([...state.trackIds, trackId]),
    }));

    try {
      const response = await fetch("/api/user/favorites/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId }),
      });

      if (!response.ok) {
        // Revert on error
        set((state) => {
          const newSet = new Set(state.trackIds);
          newSet.delete(trackId);
          return { trackIds: newSet };
        });
      }
    } catch (error) {
      console.error("Failed to add favorite track:", error);
      // Revert on error
      set((state) => {
        const newSet = new Set(state.trackIds);
        newSet.delete(trackId);
        return { trackIds: newSet };
      });
    }
  },

  removeFavoriteTrack: async (trackId: string) => {
    // Optimistic update
    set((state) => {
      const newSet = new Set(state.trackIds);
      newSet.delete(trackId);
      return { trackIds: newSet };
    });

    try {
      const response = await fetch("/api/user/favorites/tracks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId }),
      });

      if (!response.ok) {
        // Revert on error
        set((state) => ({
          trackIds: new Set([...state.trackIds, trackId]),
        }));
      }
    } catch (error) {
      console.error("Failed to remove favorite track:", error);
      // Revert on error
      set((state) => ({
        trackIds: new Set([...state.trackIds, trackId]),
      }));
    }
  },

  toggleFavoriteTrack: async (trackId: string) => {
    if (get().trackIds.has(trackId)) {
      await get().removeFavoriteTrack(trackId);
    } else {
      await get().addFavoriteTrack(trackId);
    }
  },

  addFavoriteAlbum: async (albumId: string) => {
    set((state) => ({
      albumIds: new Set([...state.albumIds, albumId]),
    }));

    try {
      const response = await fetch("/api/user/favorites/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId }),
      });

      if (!response.ok) {
        set((state) => {
          const newSet = new Set(state.albumIds);
          newSet.delete(albumId);
          return { albumIds: newSet };
        });
      }
    } catch (error) {
      console.error("Failed to add favorite album:", error);
      set((state) => {
        const newSet = new Set(state.albumIds);
        newSet.delete(albumId);
        return { albumIds: newSet };
      });
    }
  },

  removeFavoriteAlbum: async (albumId: string) => {
    set((state) => {
      const newSet = new Set(state.albumIds);
      newSet.delete(albumId);
      return { albumIds: newSet };
    });

    try {
      const response = await fetch("/api/user/favorites/albums", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId }),
      });

      if (!response.ok) {
        set((state) => ({
          albumIds: new Set([...state.albumIds, albumId]),
        }));
      }
    } catch (error) {
      console.error("Failed to remove favorite album:", error);
      set((state) => ({
        albumIds: new Set([...state.albumIds, albumId]),
      }));
    }
  },

  toggleFavoriteAlbum: async (albumId: string) => {
    if (get().albumIds.has(albumId)) {
      await get().removeFavoriteAlbum(albumId);
    } else {
      await get().addFavoriteAlbum(albumId);
    }
  },

  addFavoritePlaylist: async (playlistId: string) => {
    set((state) => ({
      playlistIds: new Set([...state.playlistIds, playlistId]),
    }));

    try {
      const response = await fetch("/api/user/favorites/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId }),
      });

      if (!response.ok) {
        set((state) => {
          const newSet = new Set(state.playlistIds);
          newSet.delete(playlistId);
          return { playlistIds: newSet };
        });
      }
    } catch (error) {
      console.error("Failed to add favorite playlist:", error);
      set((state) => {
        const newSet = new Set(state.playlistIds);
        newSet.delete(playlistId);
        return { playlistIds: newSet };
      });
    }
  },

  removeFavoritePlaylist: async (playlistId: string) => {
    set((state) => {
      const newSet = new Set(state.playlistIds);
      newSet.delete(playlistId);
      return { playlistIds: newSet };
    });

    try {
      const response = await fetch("/api/user/favorites/playlists", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId }),
      });

      if (!response.ok) {
        set((state) => ({
          playlistIds: new Set([...state.playlistIds, playlistId]),
        }));
      }
    } catch (error) {
      console.error("Failed to remove favorite playlist:", error);
      set((state) => ({
        playlistIds: new Set([...state.playlistIds, playlistId]),
      }));
    }
  },

  toggleFavoritePlaylist: async (playlistId: string) => {
    if (get().playlistIds.has(playlistId)) {
      await get().removeFavoritePlaylist(playlistId);
    } else {
      await get().addFavoritePlaylist(playlistId);
    }
  },

  isTrackFavorite: (trackId: string) => get().trackIds.has(trackId),
  isAlbumFavorite: (albumId: string) => get().albumIds.has(albumId),
  isPlaylistFavorite: (playlistId: string) => get().playlistIds.has(playlistId),

  clearFavorites: () => {
    set({
      trackIds: new Set(),
      albumIds: new Set(),
      playlistIds: new Set(),
      isLoaded: false,
    });
  },
}));
