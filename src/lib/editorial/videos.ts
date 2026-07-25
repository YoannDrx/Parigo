import "server-only";

import { unstable_cache } from "next/cache";
import type { Clip } from "./contracts";
import { clips } from "./contracts";
import { classifyVideoTitle } from "./video-classification";
import { playlistVideoOverrides } from "./video-overrides";
import type { EditorialVideo } from "./video-types";
import { fetchYouTubePlaylist } from "@/lib/youtube/playlists";
import { logEvent } from "@/lib/logger";

export const CLIPS_PLAYLIST_ID = "PLIqrBBZKnwyWMkXainshLgavNlTmx9AhG";
export const CLIPS_PLAYLIST_URL = `https://www.youtube.com/playlist?list=${CLIPS_PLAYLIST_ID}`;

function fromLocal(clip: Clip): EditorialVideo {
  return {
    ...clip,
    composerRelationSource: clip.composerSlugs.length > 0
      ? (clip.composerRelationSource || "portfolio-caro")
      : undefined,
    albumRelationSource: clip.relatedAlbumCode
      ? (clip.albumRelationSource || "portfolio-caro")
      : undefined,
  };
}

async function loadEditorialVideos(): Promise<EditorialVideo[]> {
  const localVideos = clips.map(fromLocal);
  try {
    const playlistId = process.env.YOUTUBE_CLIPS_PLAYLIST_ID || CLIPS_PLAYLIST_ID;
    const playlist = await fetchYouTubePlaylist(playlistId);
    const localByYoutubeId = new Map(
      localVideos.filter((video) => video.youtubeId).map((video) => [video.youtubeId!, video]),
    );
    const localBySlug = new Map(localVideos.map((video) => [video.slug, video]));
    const matched = new Set<string>();
    const videos = playlist.flatMap<EditorialVideo>((video) => {
      const override = playlistVideoOverrides[video.youtubeId];
      if (override?.duplicateOf) return [];
      const local = localByYoutubeId.get(video.youtubeId)
        || (override?.localSlug ? localBySlug.get(override.localSlug) : undefined);
      if (local) {
        matched.add(local.slug);
        return [{
          ...local,
          youtubeId: video.youtubeId,
          title: override?.title || local.title,
          videoType: override?.videoType || local.videoType,
          composerSlugs: override?.composerSlugs || local.composerSlugs,
          reviewState: override?.reviewState || local.reviewState,
          composerRelationSource: override?.composerRelationSource || local.composerRelationSource,
          order: video.position,
          channelTitle: video.channelTitle,
          publishedAt: video.publishedAt,
        }];
      }
      return [{
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
      }];
    });
    const localOnly = localVideos
      .filter((video) => !matched.has(video.slug))
      .map((video, index) => ({ ...video, order: playlist.length + index }));
    return [...videos, ...localOnly];
  } catch (error) {
    logEvent({
      level: "warn",
      message: "youtube_playlist_unavailable",
      route: "youtube-clips",
      code: error instanceof Error ? error.name : "UNKNOWN",
      requestId: crypto.randomUUID(),
    });
    return localVideos;
  }
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
