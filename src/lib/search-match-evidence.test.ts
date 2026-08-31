import { describe, expect, it } from "vitest";
import type { Album, Track } from "@/types";
import { albumSearchEvidence, explainsSearchQuery, normalizeCatalogReference, prioritizeAlbumSearchEvidence, prioritizeTitleEvidence, trackSearchEvidence } from "./search-match-evidence";

const track: Track = {
  id: "track-1",
  title: "Amour Triste",
  duration: 120,
  audioUrl: null,
  albumId: "album-1",
  albumTitle: "City Stories",
  genres: ["Reggae"],
  moods: ["Sad"],
  instruments: ["Piano"],
  keywords: ["Crime"],
  musicFor: ["Drama"],
  description: "A tense urban investigation",
  isVocal: null,
  waveform: null,
};

const album: Album = {
  id: "album-1",
  title: "City Stories",
  label: "Parigo",
  cover: "/cover.jpg",
  description: "Songs for a dark city",
  genres: ["Reggae"],
  trackCount: 1,
  keywords: ["Oppression"],
};

describe("search match evidence", () => {
  it("attributes terms distributed across verified fields", () => {
    const evidence = trackSearchEvidence(track, "reggae crime", album);
    expect(evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "keyword", value: "Crime" }),
      expect.objectContaining({ field: "genre", value: "Reggae" }),
    ]));
    expect(explainsSearchQuery(evidence, "reggae crime")).toBe(true);
    expect(explainsSearchQuery(evidence, "reggae crime saxophone")).toBe(false);
  });

  it("normalizes accents and casing without partial matching", () => {
    expect(trackSearchEvidence(track, "TRÍSTE", album)[0]).toEqual(expect.objectContaining({ field: "trackTitle", value: "Amour Triste" }));
    expect(trackSearchEvidence(track, "rim", album)).toEqual([]);
  });

  it("moves title evidence first without changing the relative provider order", () => {
    const ordered = prioritizeTitleEvidence([
      { id: "metadata-1", matchEvidence: [{ field: "keyword" as const, value: "Crime", matchedTerms: ["crime"] }] },
      { id: "title-1", matchEvidence: [{ field: "trackTitle" as const, value: "Crime One", matchedTerms: ["crime"] }] },
      { id: "metadata-2", matchEvidence: [{ field: "description" as const, value: "A crime cue", matchedTerms: ["crime"] }] },
      { id: "title-2", matchEvidence: [{ field: "trackTitle" as const, value: "Crime Two", matchedTerms: ["crime"] }] },
    ], "trackTitle");
    expect(ordered.map((item) => item.id)).toEqual(["title-1", "title-2", "metadata-1", "metadata-2"]);
  });

  it("normalizes exact catalogue references with optional spaces and leading zeroes", () => {
    expect(normalizeCatalogReference("PGO0033")).toBe("pgo33");
    expect(normalizeCatalogReference("PGO 0033")).toBe("pgo33");
  });

  it("ranks exact album titles and references before broader album evidence", () => {
    const candidates: Album[] = [
      { ...album, id: "track-derived", title: "Unattributed", matchEvidence: [] },
      { ...album, id: "metadata", title: "Rockabilly Rebel", keywords: ["Surf Fiction"] },
      { ...album, id: "title", title: "The Surf Fiction Sessions" },
      { ...album, id: "reference", title: "Reference Match", code: "SURF0001" },
      { ...album, id: "exact", title: "Surf Fiction" },
    ].map((candidate) => ({
      ...candidate,
      matchEvidence: candidate.matchEvidence ?? albumSearchEvidence(candidate, "Surf Fiction"),
    }));

    expect(prioritizeAlbumSearchEvidence(candidates, "Surf Fiction").map((item) => item.id)).toEqual([
      "exact",
      "title",
      "metadata",
      "track-derived",
      "reference",
    ]);

    expect(prioritizeAlbumSearchEvidence(candidates, "SURF 0001")[0]?.id).toBe("reference");
  });
});
