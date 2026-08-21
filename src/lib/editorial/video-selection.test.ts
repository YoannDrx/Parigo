import { describe, expect, it } from "vitest";
import { CLIPS_PLAYLIST_ID, type EditorialVideo } from "./video-types";
import { dedupeEditorialVideos, selectFeaturedEditorialVideos } from "./video-selection";

function video(overrides: Partial<EditorialVideo> & Pick<EditorialVideo, "slug" | "youtubeId">): EditorialVideo {
  return {
    title: { fr: overrides.slug, en: overrides.slug },
    cover: `/covers/${overrides.slug}.jpg`,
    composerSlugs: [],
    videoType: "official-video",
    source: "youtube",
    reviewState: "needs-review",
    order: 0,
    published: true,
    ...overrides,
  };
}

describe("YouTube clips selection", () => {
  it("locks the public source to the canonical Parigo playlist", () => {
    expect(CLIPS_PLAYLIST_ID).toBe("PLOmwWioa-7rw");
  });

  it("deduplicates the public inventory by YouTube identifier", () => {
    expect(dedupeEditorialVideos([
      video({ slug: "first", youtubeId: "same-video" }),
      video({ slug: "duplicate", youtubeId: "same-video", order: 1 }),
    ]).map((item) => item.slug)).toEqual(["first"]);
  });

  it("sorts every video type by recency and uses playlist order when dates are missing", () => {
    const videos = [
      video({ slug: "archive", youtubeId: "archive-id", videoType: "archive", publishedAt: "2026-08-07", order: 0 }),
      video({ slug: "undated-second", youtubeId: "undated-2", order: 4 }),
      video({ slug: "older", youtubeId: "older-id", publishedAt: "2025-01-01", order: 2 }),
      video({ slug: "newer", youtubeId: "newer-id", publishedAt: "2026-01-01", order: 3 }),
      video({ slug: "undated-first", youtubeId: "undated-1", order: 1 }),
    ];

    expect(selectFeaturedEditorialVideos(videos, 4).map((item) => item.slug)).toEqual([
      "archive",
      "newer",
      "older",
      "undated-first",
    ]);
  });

  it("uses playlist order to break equal dates and filters unusable videos before limiting", () => {
    const official = Array.from({ length: 8 }, (_, index) => video({
      slug: `official-${index}`,
      youtubeId: `official-${index}`,
      order: index + 2,
      publishedAt: "2026-01-01",
    }));
    const teaser = video({ slug: "teaser", youtubeId: "teaser-id", videoType: "teaser", order: 1, publishedAt: "2026-01-01" });
    const archive = video({ slug: "archive", youtubeId: "archive-id", videoType: "archive", order: 0, publishedAt: "2026-08-08" });
    const unusable = video({ slug: "unusable", youtubeId: "", order: -1, publishedAt: "2027-01-01" });
    expect(selectFeaturedEditorialVideos([unusable, teaser, ...official, archive])).toHaveLength(8);
    expect(selectFeaturedEditorialVideos([unusable, teaser, ...official, archive], 3).map((item) => item.slug)).toEqual([
      "archive",
      "teaser",
      "official-0",
    ]);
  });
});
