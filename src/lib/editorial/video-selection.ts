import type { EditorialVideo } from "./video-types";

function compareByRecency(left: EditorialVideo, right: EditorialVideo) {
  const leftTime = left.publishedAt ? Date.parse(left.publishedAt) : Number.NaN;
  const rightTime = right.publishedAt ? Date.parse(right.publishedAt) : Number.NaN;
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) return rightTime - leftTime;
  if (Number.isFinite(leftTime) !== Number.isFinite(rightTime)) return Number.isFinite(rightTime) ? 1 : -1;
  return left.order - right.order;
}

export function dedupeEditorialVideos(videos: EditorialVideo[]): EditorialVideo[] {
  const seenYouTubeIds = new Set<string>();
  return videos.filter((video) => {
    if (!video.youtubeId) return true;
    if (seenYouTubeIds.has(video.youtubeId)) return false;
    seenYouTubeIds.add(video.youtubeId);
    return true;
  });
}

export function selectFeaturedEditorialVideos(videos: EditorialVideo[], limit = 8): EditorialVideo[] {
  return dedupeEditorialVideos(videos)
    .filter((video) => video.youtubeId)
    .sort(compareByRecency)
    .slice(0, limit);
}
