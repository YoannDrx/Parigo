import { CLIPS_PLAYLIST_ID } from "../src/lib/editorial/video-types";
import { VIDEO_COMPOSER_RELATIONS } from "../src/lib/editorial/video-composer-relations";
import { classifyVideoTitle } from "../src/lib/editorial/video-classification";
import { fetchYouTubePlaylist } from "../src/lib/youtube/playlists";

async function main() {
  const videos = await fetchYouTubePlaylist(CLIPS_PLAYLIST_ID);
  const duplicateIds = videos
    .filter((video, index) => videos.findIndex((candidate) => candidate.youtubeId === video.youtubeId) !== index)
    .map((video) => video.youtubeId);
  const typeCounts = new Map<string, number>();
  const publicVideoIds = new Set(videos.map((video) => video.youtubeId));
  const missingRelatedVideoIds = Object.keys(VIDEO_COMPOSER_RELATIONS)
    .filter((youtubeId) => !publicVideoIds.has(youtubeId));
  videos.forEach((video) => {
    const type = classifyVideoTitle(video.title);
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
  });

  if (!videos.length) throw new Error(`La playlist ${CLIPS_PLAYLIST_ID} ne contient aucune vidéo publique.`);
  if (duplicateIds.length) throw new Error(`Identifiants YouTube dupliqués : ${[...new Set(duplicateIds)].join(", ")}`);
  if (missingRelatedVideoIds.length) {
    throw new Error(`Clips liés à des compositeurs absents de la playlist publique : ${missingRelatedVideoIds.join(", ")}`);
  }

  process.stdout.write(`${JSON.stringify({
    auditedAt: new Date().toISOString(),
    playlistId: CLIPS_PLAYLIST_ID,
    publicVideos: videos.length,
    uniqueVideos: new Set(videos.map((video) => video.youtubeId)).size,
    relatedVideos: Object.keys(VIDEO_COMPOSER_RELATIONS).length,
    composerAssociations: Object.values(VIDEO_COMPOSER_RELATIONS)
      .reduce((total, composerSlugs) => total + composerSlugs.length, 0),
    types: Object.fromEntries([...typeCounts].sort()),
    videos: videos.map((video) => ({
      youtubeId: video.youtubeId,
      title: video.title,
      type: classifyVideoTitle(video.title),
      position: video.position,
    })),
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
