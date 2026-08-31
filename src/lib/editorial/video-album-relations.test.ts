import { describe, expect, it } from "vitest";
import { getVideoAlbumCode, VIDEO_ALBUM_RELATIONS } from "./video-album-relations";

describe("manual video-to-album relations", () => {
  it("contains only stable Parigo album codes", () => {
    expect(Object.keys(VIDEO_ALBUM_RELATIONS)).toHaveLength(23);
    for (const [youtubeId, albumCode] of Object.entries(VIDEO_ALBUM_RELATIONS)) {
      expect(youtubeId).not.toBe("");
      expect(albumCode).toMatch(/^PGO\d{4}$/);
    }
  });

  it.each([
    ["Hold Me Closer", "LLzCnoushi0", "PGO0043"],
    ["Une Première Fois", "EPnfDdfOx94", "PGO0042"],
    ["Klang Brutt", "FbuyBO-115s", "PGO0025"],
    ["Blackout", "6uWDbe6IhEg", "PGO0027"],
    ["Baïkal", "GjkpUarLgIs", "PGO0002"],
    ["Don't Give Up Now", "XmsEYm9_8MM", "PGO0009"],
    ["3 Bikinis", "FNoeX3pfJdc", "PGO0009"],
    ["Quelque Chose", "GMa-HQwGp-M", "PGO0001"],
    ["Arat Kilo — Madala", "YwoM5ozETlw", "PGO0030"],
    ["9 O'Clock — DMC DJ", "v0-tsDTGjnE", "PGO0027"],
    ["Myles Sanko — My Inspiration", "IUaSPUiykTo", "PGO0006"],
  ])("links %s to its verified album", (_title, youtubeId, albumCode) => {
    expect(getVideoAlbumCode(youtubeId)).toBe(albumCode);
  });

  it("does not infer a relation for an unknown video", () => {
    expect(getVideoAlbumCode("wrO96WV69aY")).toBe("PGO0050");
    expect(getVideoAlbumCode("unknown-video")).toBeUndefined();
  });
});
