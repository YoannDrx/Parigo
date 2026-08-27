import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import {
  getAlbum,
  getAlbums,
  getAlbumDiscovery,
  getLabel,
  getLabels,
  getPlaylist,
  getPlaylistDiscovery,
  getPlaylists,
  getTrack,
  getStyles,
  getCategories,
} from "./catalog";

export const getCachedTrack = cache(
  unstable_cache(getTrack, ["catalog-track-v1"], { revalidate: 86400, tags: ["catalog", "tracks"] }),
);
export const getCachedAlbum = cache(
  unstable_cache(getAlbum, ["catalog-album-v4-right-holders"], { revalidate: 300, tags: ["catalog", "albums"] }),
);
export const getCachedAlbums = cache(
  unstable_cache(getAlbums, ["catalog-albums-v2"], { revalidate: 300, tags: ["catalog", "albums"] }),
);
export const getCachedAlbumDiscovery = cache(
  unstable_cache(getAlbumDiscovery, ["catalog-album-discovery-v3"], { revalidate: 300, tags: ["catalog", "albums", "filters"] }),
);
export const getCachedAlbumCount = cache(
  unstable_cache(async () => (await getAlbums({ limit: 1 })).total, ["catalog-album-count"], { revalidate: 86400, tags: ["catalog", "sitemaps"] }),
);
export const getCachedLabel = cache(
  unstable_cache(getLabel, ["catalog-label-v3-localized"], { revalidate: 600, tags: ["catalog", "labels"] }),
);
export const getCachedLabels = cache(
  unstable_cache(getLabels, ["catalog-labels-v3-localized"], { revalidate: 600, tags: ["catalog", "labels"] }),
);
export const getCachedPlaylist = cache(
  unstable_cache(getPlaylist, ["catalog-playlist-v2-localized"], { revalidate: 600, tags: ["catalog", "playlists"] }),
);
export const getCachedPlaylists = cache(
  unstable_cache(getPlaylists, ["catalog-playlists-v2-localized"], { revalidate: 600, tags: ["catalog", "playlists"] }),
);
export const getCachedPlaylistDiscovery = cache(
  unstable_cache(getPlaylistDiscovery, ["catalog-playlist-discovery-v3-track-index"], { revalidate: 86400, tags: ["catalog", "playlists", "filters"] }),
);
export const getCachedStyles = cache(
  unstable_cache(getStyles, ["catalog-styles"], { revalidate: 3600, tags: ["catalog", "filters"] }),
);
export const getCachedCategories = cache(
  unstable_cache(getCategories, ["catalog-categories"], { revalidate: 3600, tags: ["catalog", "filters"] }),
);
