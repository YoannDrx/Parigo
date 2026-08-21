import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchYouTubePlaylist } from "./playlists";

const originalYouTubeApiKey = process.env.YOUTUBE_API_KEY;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalYouTubeApiKey === undefined) delete process.env.YOUTUBE_API_KEY;
  else process.env.YOUTUBE_API_KEY = originalYouTubeApiKey;
});

describe("YouTube playlist metadata", () => {
  it("uses each video's publication date instead of its playlist insertion date", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [
          {
            snippet: {
              title: "Older video",
              publishedAt: "2026-08-07T15:06:49Z",
              position: 0,
              resourceId: { videoId: "older-video" },
            },
            contentDetails: { videoId: "older-video" },
          },
          {
            snippet: {
              title: "Newer video",
              publishedAt: "2026-08-07T14:48:15Z",
              position: 1,
              resourceId: { videoId: "newer-video" },
            },
            contentDetails: { videoId: "newer-video" },
          },
        ],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [
          { id: "older-video", snippet: { publishedAt: "2011-12-07T14:31:33Z" } },
          { id: "newer-video", snippet: { publishedAt: "2026-04-22T11:40:53Z" } },
        ],
      }), { status: 200 }));

    const videos = await fetchYouTubePlaylist("playlist-id");

    expect(videos.map((video) => ({ id: video.youtubeId, publishedAt: video.publishedAt }))).toEqual([
      { id: "older-video", publishedAt: "2011-12-07T14:31:33Z" },
      { id: "newer-video", publishedAt: "2026-04-22T11:40:53Z" },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain("youtube/v3/videos?");
  });
});
