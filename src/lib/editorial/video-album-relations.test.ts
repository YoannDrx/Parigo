import { describe, expect, it } from "vitest";
import { getVideoAlbumCode, VIDEO_ALBUM_RELATIONS } from "./video-album-relations";

describe("manual video-to-album relations", () => {
  it("contains only stable Parigo album codes", () => {
    expect(Object.keys(VIDEO_ALBUM_RELATIONS)).toHaveLength(12);
    for (const [youtubeId, albumCode] of Object.entries(VIDEO_ALBUM_RELATIONS)) {
      expect(youtubeId).not.toBe("");
      expect(albumCode).toMatch(/^PGO\d{4}$/);
    }
  });

  it("does not infer a relation for an unknown video", () => {
    expect(getVideoAlbumCode("wrO96WV69aY")).toBe("PGO0050");
    expect(getVideoAlbumCode("unknown-video")).toBeUndefined();
  });
});
