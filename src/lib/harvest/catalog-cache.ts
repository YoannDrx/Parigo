import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import {
  getAlbum,
  getAlbums,
  getLabel,
  getLabels,
  getPlaylist,
  getPlaylists,
  getStyles,
  getCategories,
} from "./catalog";

export const getCachedAlbum = cache(
  unstable_cache(getAlbum, ["catalog-album"], { revalidate: 300, tags: ["catalog", "albums"] }),
);
export const getCachedAlbums = cache(
  unstable_cache(getAlbums, ["catalog-albums"], { revalidate: 300, tags: ["catalog", "albums"] }),
);
export const getCachedAlbumCount = cache(
  unstable_cache(async () => (await getAlbums({ limit: 1 })).total, ["catalog-album-count"], { revalidate: 86400, tags: ["catalog", "sitemaps"] }),
);
export const getCachedLabel = cache(
  unstable_cache(getLabel, ["catalog-label"], { revalidate: 600, tags: ["catalog", "labels"] }),
);
export const getCachedLabels = cache(
  unstable_cache(getLabels, ["catalog-labels"], { revalidate: 600, tags: ["catalog", "labels"] }),
);
export const getCachedPlaylist = cache(
  unstable_cache(getPlaylist, ["catalog-playlist"], { revalidate: 600, tags: ["catalog", "playlists"] }),
);
export const getCachedPlaylists = cache(
  unstable_cache(getPlaylists, ["catalog-playlists"], { revalidate: 600, tags: ["catalog", "playlists"] }),
);
export const getCachedStyles = cache(
  unstable_cache(getStyles, ["catalog-styles"], { revalidate: 3600, tags: ["catalog", "filters"] }),
);
export const getCachedCategories = cache(
  unstable_cache(getCategories, ["catalog-categories"], { revalidate: 3600, tags: ["catalog", "filters"] }),
);
