import { describe, expect, it } from "vitest";
import { detectSimilarityPlatform, looksLikeExternalUrl } from "./similarity-platforms";

describe("similarity platform detection", () => {
  it.each([
    ["https://youtu.be/example", "youtube"],
    ["https://music.youtube.com/watch?v=example", "youtube"],
    ["https://open.spotify.com/track/example", "spotify"],
    ["https://vimeo.com/123", "vimeo"],
    ["https://soundcloud.com/parigo/example", "soundcloud"],
    ["https://music.apple.com/fr/album/example", "appleMusic"],
    ["https://www.tiktok.com/@parigo/video/123", "tiktok"],
  ])("recognizes %s", (url, expected) => {
    expect(detectSimilarityPlatform(url)).toBe(expected);
  });

  it.each([
    "http://open.spotify.com/track/example",
    "https://spotify.example.com/track/example",
    "https://127.0.0.1/audio",
    "https://user:credential@youtube.com/watch?v=example",
    "not a url",
  ])("rejects unsafe or unsupported input %s", (url) => {
    expect(detectSimilarityPlatform(url)).toBeNull();
  });

  it("distinguishes an unsupported URL from a natural-language brief", () => {
    expect(looksLikeExternalUrl("https://example.com/audio")).toBe(true);
    expect(looksLikeExternalUrl("Une tension cinématique nocturne")).toBe(false);
  });
});
