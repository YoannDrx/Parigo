import { describe, expect, it } from "vitest";
import type { Album, Track } from "@/types";
import type { ComposerProfile } from "@/lib/editorial/contracts";
import { albumCreditsMatch, resolveComposerAlbums } from "./composers";

function albumWith(composers: string[]): Album & { tracks: Track[] } {
  return {
    id: "album",
    title: "Album",
    label: "Parigo",
    cover: "/cover.jpg",
    genres: [],
    trackCount: 1,
    tracks: [{
      id: "track",
      title: "Track",
      duration: 30,
      audioUrl: null,
      albumId: "album",
      genres: [],
      moods: [],
      isVocal: false,
      waveform: null,
      composers,
    }],
  };
}

describe("albumCreditsMatch", () => {
  it("accepts an exact normalized credit", () => {
    expect(albumCreditsMatch(albumWith(["Éric Débris (SACEM)"]), ["Eric Debris"])).toBe(true);
  });

  it("does not accept an approximate name", () => {
    expect(albumCreditsMatch(albumWith(["Jean Dupont"]), ["Jean Dupond"])).toBe(false);
  });

  it("deduplicates candidates and verifies actual track credits", async () => {
    const accepted = albumWith(["Éric Débris (SACEM)"]);
    accepted.id = "accepted";
    const rejected = albumWith(["Someone Else"]);
    rejected.id = "rejected";
    const profile: ComposerProfile = {
      slug: "eric-debris",
      name: "Eric Debris",
      image: "/images/composers/eric-debris.webp",
      bio: {},
      links: [],
      kind: "person",
      harvestAliases: ["Eric Debris"],
      published: true,
      source: "portfolio-caro",
    };
    const result = await resolveComposerAlbums(profile, {
      searchAlbums: async () => ({
        items: [
          { ...accepted, tracks: undefined },
          { ...accepted, tracks: undefined },
          { ...rejected, tracks: undefined },
        ],
        total: 3,
        page: 1,
        pageSize: 100,
        facets: { bpm: { min: 0, max: 0 }, duration: { min: 0, max: 0 }, labels: [], categories: [], styles: [] },
      }),
      loadAlbum: async (id) => ({ album: id === "accepted" ? accepted : rejected, similar: [] }),
    });
    expect(result.state).toBe("ready");
    expect(result.albums.map((album) => album.id)).toEqual(["accepted"]);
  });

  it("keeps upstream failures distinct from an empty discography", async () => {
    const profile: ComposerProfile = {
      slug: "eric-debris",
      name: "Eric Debris",
      image: "/images/composers/eric-debris.webp",
      bio: {},
      links: [],
      kind: "person",
      harvestAliases: ["Eric Debris"],
      published: true,
      source: "portfolio-caro",
    };
    const result = await resolveComposerAlbums(profile, {
      searchAlbums: async () => { throw new Error("upstream unavailable"); },
      loadAlbum: async () => { throw new Error("must not run"); },
    });
    expect(result).toEqual({ state: "unavailable", albums: [] });
  });
});
