import "server-only";

import { unstable_cache } from "next/cache";
import { SYNCHRONISATIONS, type Synchronisation } from "@/content/synchronisations";
import { logEvent } from "@/lib/logger";
import { fetchYouTubePlaylist, type YouTubePlaylistVideo } from "./playlists";

const DEFAULT_PLAYLIST_ID = "PLIqrBBZKnwyVwPEP4ghAVEGs8UiPlfgXQ";

function mapVideo(input: YouTubePlaylistVideo): Synchronisation {
  const editorial = SYNCHRONISATIONS.find((item) => item.youtubeId === input.youtubeId);
  const year = input.publishedAt ? new Date(input.publishedAt).getUTCFullYear() : undefined;
  if (editorial) {
    return {
      ...editorial,
      image: input.thumbnail || editorial.image,
      publishedAt: input.publishedAt,
      position: input.position,
      year,
      source: "youtube",
    };
  }
  const description = input.description?.replace(/\s+/g, " ").trim();
  return {
    slug: input.youtubeId,
    title: input.title.replace(/\s+/g, " ").trim() || "Synchronisation Parigo",
    client: input.channelTitle || "Parigo Music",
    image: input.thumbnail,
    youtubeId: input.youtubeId,
    descriptionFr: description || "Une synchronisation issue de la sélection audiovisuelle Parigo Music.",
    descriptionEn: description || "A synchronisation from Parigo Music’s audiovisual selection.",
    publishedAt: input.publishedAt,
    position: input.position,
    year,
    source: "youtube",
  };
}

async function loadSynchronisations(): Promise<Synchronisation[]> {
  const playlistId = process.env.YOUTUBE_SYNCHRONISATIONS_PLAYLIST_ID || DEFAULT_PLAYLIST_ID;
  try {
    return (await fetchYouTubePlaylist(playlistId)).map(mapVideo);
  } catch (error) {
    logEvent({
      level: "warn",
      message: "youtube_playlist_unavailable",
      route: "youtube-synchronisations",
      code: error instanceof Error ? error.name : "UNKNOWN",
      requestId: crypto.randomUUID(),
    });
    return SYNCHRONISATIONS;
  }
}

export const getSynchronisations = unstable_cache(
  loadSynchronisations,
  ["youtube-synchronisations-v3"],
  { revalidate: 86400, tags: ["youtube", "synchronisations"] },
);

export async function getSynchronisation(slug: string): Promise<Synchronisation | undefined> {
  return (await getSynchronisations()).find((item) => item.slug === slug || item.youtubeId === slug);
}
