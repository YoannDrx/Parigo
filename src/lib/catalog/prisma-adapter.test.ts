import { describe, expect, it } from "vitest";
import { mapPrismaTrack } from "./prisma-adapter";

describe("Prisma catalog mapping", () => {
  it("normalise une piste vers le DTO public", () => {
    const result = mapPrismaTrack({
      id: "track-1",
      slug: "signal",
      title: "Signal",
      duration: 120,
      bpm: 92,
      key: "Dm",
      audioId: null,
      albumId: "album-1",
      isVocal: false,
      waveform: [0.1, "invalid", 0.8],
      isrc: null,
      spotifyId: null,
      previewUrl: "/preview.mp3",
      trackNumber: 1,
      order: 0,
      isActive: true,
      playCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      audio: null,
      album: { id: "album-1", slug: "album", title: "Album", cover: { path: "/cover.avif" } },
      genres: [{ genre: { name: "Électronique" } }],
      moods: [{ mood: { name: "Tendu" } }],
      instruments: [{ instrument: { name: "Synthétiseur" } }],
      artists: [{ artist: { name: "Camille", slug: "camille" } }],
    } as Parameters<typeof mapPrismaTrack>[0]);

    expect(result).toMatchObject({
      id: "track-1",
      audioUrl: "/preview.mp3",
      albumCover: "/cover.avif",
      genres: ["Électronique"],
      waveform: [0.1, 0.8],
    });
  });
});
