import { clips } from "../src/lib/editorial/contracts";
import { classifyVideoTitle } from "../src/lib/editorial/video-classification";
import { playlistVideoOverrides } from "../src/lib/editorial/video-overrides";
import { fetchYouTubePlaylist } from "../src/lib/youtube/playlists";

const CLIPS_PLAYLIST_ID = "PLIqrBBZKnwyWMkXainshLgavNlTmx9AhG";

async function main() {
  const playlistId = process.env.YOUTUBE_CLIPS_PLAYLIST_ID || CLIPS_PLAYLIST_ID;
  const videos = await fetchYouTubePlaylist(playlistId);
  const localById = new Map(clips.filter((clip) => clip.youtubeId).map((clip) => [clip.youtubeId!, clip]));
  const localBySlug = new Map(clips.map((clip) => [clip.slug, clip]));
  const resolvedLocal = (youtubeId: string) => {
    const override = playlistVideoOverrides[youtubeId];
    return localById.get(youtubeId)
      || (override?.localSlug ? localBySlug.get(override.localSlug) : undefined);
  };
  const matched = videos.filter((video) => Boolean(resolvedLocal(video.youtubeId)));
  const newVideos = videos.filter((video) => (
    !resolvedLocal(video.youtubeId) && !playlistVideoOverrides[video.youtubeId]?.duplicateOf
  ));
  const matchedSlugs = new Set(matched.map((video) => resolvedLocal(video.youtubeId)?.slug).filter(Boolean));
  const missingFromPlaylist = clips.filter((clip) => !matchedSlugs.has(clip.slug));
  const typeCounts = new Map<string, number>();
  videos.forEach((video) => {
    const type = playlistVideoOverrides[video.youtubeId]?.videoType
      || resolvedLocal(video.youtubeId)?.videoType
      || classifyVideoTitle(video.title);
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
  });

  process.stdout.write(`${JSON.stringify({
    auditedAt: new Date().toISOString(),
    playlistId,
    publicVideos: videos.length,
    matchedEditorialVideos: matched.length,
    newVideos: newVideos.length,
    duplicates: Object.entries(playlistVideoOverrides)
      .filter(([, override]) => override.duplicateOf)
      .map(([youtubeId, override]) => ({ youtubeId, duplicateOf: override.duplicateOf })),
    localVideosMissingFromPlaylist: missingFromPlaylist.map((video) => ({
      slug: video.slug,
      youtubeId: video.youtubeId,
    })),
    types: Object.fromEntries([...typeCounts].sort()),
    needsEditorialReview: newVideos.map((video) => ({
      youtubeId: video.youtubeId,
      title: video.title,
      proposedType: classifyVideoTitle(video.title),
      position: video.position,
    })),
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
