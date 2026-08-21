import "server-only";

import { unstable_cache } from "next/cache";
import type { Synchronisation } from "./synchronisation-types";
import { fetchYouTubePlaylist, type YouTubePlaylistVideo } from "./playlists";

const DEFAULT_PLAYLIST_ID = "PLIqrBBZKnwyVwPEP4ghAVEGs8UiPlfgXQ";

function mapVideo(input: YouTubePlaylistVideo): Synchronisation {
  const year = input.publishedAt ? new Date(input.publishedAt).getUTCFullYear() : undefined;
  return {
    slug: input.youtubeId,
    title: input.title.replace(/\s+/g, " ").trim(),
    client: input.channelTitle || "",
    image: input.thumbnail,
    youtubeId: input.youtubeId,
    descriptionFr: input.description || "",
    descriptionEn: input.description || "",
    publishedAt: input.publishedAt,
    position: input.position,
    year,
    source: "youtube",
  };
}

async function loadSynchronisations(): Promise<Synchronisation[]> {
  const playlistId = process.env.YOUTUBE_SYNCHRONISATIONS_PLAYLIST_ID || DEFAULT_PLAYLIST_ID;
  return (await fetchYouTubePlaylist(playlistId)).map(mapVideo);
}

export const getSynchronisations = unstable_cache(
  loadSynchronisations,
  ["youtube-synchronisations-v4"],
  { revalidate: 86400, tags: ["youtube", "synchronisations"] },
);

export async function getSynchronisation(slug: string): Promise<Synchronisation | undefined> {
  return (await getSynchronisations()).find((item) => item.slug === slug || item.youtubeId === slug);
}
