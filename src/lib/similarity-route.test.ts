import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { publicSimilarityTrack } from "./similarity-route";
import type { Track } from "@/types";

const track: Track = {
  id: "track-1",
  title: "Reference",
  duration: 120,
  audioUrl: "https://audio.example.test/track.mp3?token=public&source=aims-prompt",
  albumId: "album-1",
  genres: [],
  moods: [],
  isVocal: null,
  waveform: null,
};

describe("public similarity tracks", () => {
  it("removes provider-only attribution from playable URLs without changing the token", () => {
    const result = publicSimilarityTrack(track);

    expect(result.audioUrl).toBe("https://audio.example.test/track.mp3?token=public");
    expect(result).not.toBe(track);
  });

  it("keeps unrelated source markers intact", () => {
    const editorial = { ...track, audioUrl: "https://audio.example.test/track.mp3?source=editorial" };

    expect(publicSimilarityTrack(editorial)).toBe(editorial);
  });
});
