import "server-only";

import { unstable_cache } from "next/cache";
import { classifyVideoTitle } from "./video-classification";
import type { EditorialVideo } from "./video-types";
import { fetchYouTubePlaylist } from "@/lib/youtube/playlists";

export const CLIPS_PLAYLIST_ID = "PLIqrBBZKnwyWMkXainshLgavNlTmx9AhG";
export const CLIPS_PLAYLIST_URL = `https://www.youtube.com/playlist?list=${CLIPS_PLAYLIST_ID}`;

async function loadEditorialVideos(): Promise<EditorialVideo[]> {
  const playlistId = process.env.YOUTUBE_CLIPS_PLAYLIST_ID || CLIPS_PLAYLIST_ID;
  return (await fetchYouTubePlaylist(playlistId)).map((video): EditorialVideo => ({
    slug: `yt-${video.youtubeId}`,
    title: { fr: video.title, en: video.title },
    description: video.description
      ? { fr: video.description, en: video.description }
      : undefined,
    cover: video.thumbnail,
    youtubeId: video.youtubeId,
    composerSlugs: [],
    videoType: classifyVideoTitle(video.title),
    source: "youtube",
    reviewState: "needs-review",
    channelTitle: video.channelTitle,
    publishedAt: video.publishedAt,
    order: video.position,
    published: true,
  }));
}

export const getEditorialVideos = unstable_cache(
  loadEditorialVideos,
  ["youtube-clips-v1"],
  { revalidate: 86400, tags: ["youtube", "clips", "editorial"] },
);

export async function getEditorialVideo(slug: string): Promise<EditorialVideo | undefined> {
  return (await getEditorialVideos()).find((video) => video.slug === slug || video.youtubeId === slug);
}

export async function getFeaturedEditorialVideos(limit = 8): Promise<EditorialVideo[]> {
  const videos = await getEditorialVideos();
  const preferred = videos.filter((video) => video.videoType === "official-video" && video.youtubeId);
  const fallback = videos.filter((video) => video.youtubeId && !preferred.includes(video));
  return [...preferred, ...fallback].slice(0, limit);
}
