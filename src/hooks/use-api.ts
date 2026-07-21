"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchAlbums,
  fetchAlbum,
  fetchTracks,
  searchAll,
  fetchLabels,
  fetchPlaylists,
  fetchGenres,
  fetchMoods,
  fetchInstruments,
  fetchCategoryGroups,
  fetchStyles,
  fetchSearchFilters,
} from "@/lib/api-client";

// Albums hooks
export function useAlbums(params?: Parameters<typeof fetchAlbums>[0], enabled = true) {
  return useQuery({
    queryKey: ["albums", params],
    queryFn: ({ signal }) => fetchAlbums(params, signal),
    enabled,
  });
}

export function useSearchFilters(language: "fr" | "en") {
  return useQuery({
    queryKey: ["search-filters", language],
    queryFn: ({ signal }) => fetchSearchFilters(language, signal),
    staleTime: 1000 * 60 * 60,
  });
}

export function useCategoryGroups(language: "fr" | "en") {
  return useQuery({
    queryKey: ["harvest-categories", language],
    queryFn: () => fetchCategoryGroups(language),
    staleTime: 1000 * 60 * 60,
  });
}

export function useStyles() {
  return useQuery({
    queryKey: ["harvest-styles"],
    queryFn: fetchStyles,
    staleTime: 1000 * 60 * 60,
  });
}

export function useFeaturedAlbums(limit = 6) {
  return useQuery({
    queryKey: ["albums", "featured", limit],
    queryFn: () => fetchAlbums({ featured: true, limit }),
  });
}

export function useAlbum(idOrSlug: string) {
  return useQuery({
    queryKey: ["album", idOrSlug],
    queryFn: () => fetchAlbum(idOrSlug),
    enabled: !!idOrSlug,
  });
}

// Tracks hooks
export function useTracks(params?: Parameters<typeof fetchTracks>[0], enabled = true) {
  return useQuery({
    queryKey: ["tracks", params],
    queryFn: ({ signal }) => fetchTracks(params, signal),
    enabled,
    staleTime: 20_000,
  });
}

// Search hook
export function useSearch(query: string, type?: "all" | "albums" | "tracks") {
  return useQuery({
    queryKey: ["search", query, type],
    queryFn: () => searchAll(query, type),
    enabled: query.length >= 2,
  });
}

// Labels hooks
export function useLabels(params?: Parameters<typeof fetchLabels>[0]) {
  return useQuery({
    queryKey: ["labels", params],
    queryFn: () => fetchLabels(params),
  });
}

// Playlists hooks
export function usePlaylists(params?: Parameters<typeof fetchPlaylists>[0]) {
  return useQuery({
    queryKey: ["playlists", params],
    queryFn: () => fetchPlaylists(params),
  });
}

export function useFeaturedPlaylists(limit = 4) {
  return useQuery({
    queryKey: ["playlists", "featured", limit],
    queryFn: () => fetchPlaylists({ featured: true, limit }),
  });
}

// Genres and Moods hooks
export function useGenres() {
  return useQuery({
    queryKey: ["genres"],
    queryFn: fetchGenres,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
}

export function useMoods() {
  return useQuery({
    queryKey: ["moods"],
    queryFn: fetchMoods,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
}

export function useInstruments() {
  return useQuery({
    queryKey: ["instruments"],
    queryFn: fetchInstruments,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
}
