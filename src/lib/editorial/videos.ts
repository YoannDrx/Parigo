import "server-only";

import { unstable_cache } from "next/cache";
import { getVideoComposerSlugs } from "./video-composer-relations";
import { getVideoAlbumCode } from "./video-album-relations";
import { classifyVideoTitle } from "./video-classification";
import { dedupeEditorialVideos, selectFeaturedEditorialVideos } from "./video-selection";
import { CLIPS_PLAYLIST_ID, type EditorialVideo } from "./video-types";
import { fetchYouTubePlaylist } from "@/lib/youtube/playlists";

export { CLIPS_PLAYLIST_ID, CLIPS_PLAYLIST_URL } from "./video-types";

async function loadEditorialVideos(): Promise<EditorialVideo[]> {
  return dedupeEditorialVideos((await fetchYouTubePlaylist(CLIPS_PLAYLIST_ID)).map((video): EditorialVideo => {
    const composerSlugs = getVideoComposerSlugs(video.youtubeId);
    const relatedAlbumCode = getVideoAlbumCode(video.youtubeId);
    return {
      slug: `yt-${video.youtubeId}`,
      title: { fr: video.title, en: video.title },
      description: video.description
        ? { fr: video.description, en: video.description }
        : undefined,
      cover: video.thumbnail,
      youtubeId: video.youtubeId,
      composerSlugs,
      relatedAlbumCode,
      videoType: classifyVideoTitle(video.title),
      source: "youtube",
      reviewState: "needs-review",
      composerRelationSource: composerSlugs.length > 0 ? "manual" : undefined,
      albumRelationSource: relatedAlbumCode ? "manual" : undefined,
      channelTitle: video.channelTitle,
      publishedAt: video.publishedAt,
      order: video.position,
      published: true,
    };
  }));
}

export const getEditorialVideos = unstable_cache(
  loadEditorialVideos,
  ["youtube-clips-v4", CLIPS_PLAYLIST_ID],
  { revalidate: 3600, tags: ["youtube", "clips", "editorial"] },
);

export async function getEditorialVideo(slug: string): Promise<EditorialVideo | undefined> {
  return (await getEditorialVideos()).find((video) => video.slug === slug || video.youtubeId === slug);
}

export async function getFeaturedEditorialVideos(limit = 8): Promise<EditorialVideo[]> {
  return selectFeaturedEditorialVideos(await getEditorialVideos(), limit);
}

export async function getEditorialVideosForComposer(composerSlug: string): Promise<EditorialVideo[]> {
  return (await getEditorialVideos()).filter((video) => video.composerSlugs.includes(composerSlug));
}
