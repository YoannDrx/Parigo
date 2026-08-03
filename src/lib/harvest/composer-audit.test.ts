import { describe, expect, it } from "vitest";
import type { Album, Track } from "@/types";
import {
  arePotentialComposerSpellings,
  buildComposerAudit,
  composerAuditBaseName,
} from "./composer-audit";

function track(input: Partial<Track> & Pick<Track, "id" | "title">): Track {
  return {
    duration: 0,
    audioUrl: null,
    albumId: "album-1",
    genres: [],
    moods: [],
    isVocal: null,
    waveform: null,
    ...input,
  };
}

function album(tracks: Track[]): Album & { tracks: Track[] } {
  return {
    id: "album-1",
    code: "PGO0050",
    title: "Riviera Bizarre",
    label: "Parigo",
    cover: "/cover.jpg",
    genres: [],
    trackCount: tracks.length,
    tracks,
  };
}

describe("Harvest composer audit", () => {
  it("retire seulement une société finale pour proposer une base de contrôle", () => {
    expect(composerAuditBaseName("Minimatic (NS)")).toBe("Minimatic");
    expect(composerAuditBaseName("Flore Morfin (SACEM)")).toBe("Flore Morfin");
    expect(composerAuditBaseName("Nom (Live)")).toBe("Nom (Live)");
  });

  it("repère les fautes proches sans fusionner les personnes", () => {
    expect(arePotentialComposerSpellings("Flore Morchin", "Flore Morfin")).toBe(true);
    expect(arePotentialComposerSpellings("208", "2080")).toBe(true);
    expect(arePotentialComposerSpellings("Minimatic", "Sebastien Blanchon")).toBe(false);
  });

  it("conserve les crédits exacts et regroupe leurs variantes potentielles", () => {
    const data = buildComposerAudit([album([
      track({
        id: "track-1",
        title: "Get Set Jet Set",
        composers: ["Minimatic"],
        rightHolders: [{ id: "holder-1", name: "Minimatic", capacity: "Composer" }],
      }),
      track({
        id: "track-2",
        title: "Cote D'Exotica",
        composers: ["Minimatic (NS)"],
        rightHolders: [{ id: "holder-1", name: "Minimatic", capacity: "Composer" }],
      }),
    ])], { capturedAt: "2026-08-03T12:00:00.000Z" });

    expect(data.credits).toHaveLength(2);
    expect(data.metrics.duplicateGroupCount).toBe(1);
    expect(data.metrics.societySuffixCount).toBe(1);
    expect(data.credits.find((credit) => credit.name === "Minimatic (NS)")).toMatchObject({
      baseName: "Minimatic",
      variants: ["Minimatic", "Minimatic (NS)"],
      albumCount: 1,
      trackCount: 1,
      alignedTrackCount: 1,
    });
  });

  it("sépare les crédits publics manquants des noms contradictoires", () => {
    const data = buildComposerAudit([album([
      track({
        id: "track-missing",
        title: "Cote D'Exotica",
        composers: [],
        rightHolders: [{ id: "holder-1", name: "Minimatic", capacity: "Composer" }],
      }),
      track({
        id: "track-different",
        title: "Liquid Flore Remix",
        composers: ["Flore Morchin (SACEM)"],
        rightHolders: [{ id: "holder-2", name: "Flore Morfin", capacity: "Composer" }],
      }),
      track({
        id: "track-no-holder",
        title: "Version courte",
        composers: ["Minimatic"],
        rightHolders: [],
      }),
    ])]);

    expect(data.metrics).toMatchObject({
      missingPublicCreditCount: 1,
      differentRightHoldersCount: 1,
      missingStructuredCreditCount: 1,
    });
    expect(data.trackAnomalies.map((item) => item.kind).sort()).toEqual([
      "different-right-holders",
      "missing-public-credit",
    ]);
  });

  it("utilise l’inventaire de pistes exposé à plat par l’album", () => {
    const alternate = track({
      id: "alternate-1",
      title: "Main 30 sec",
      isAlternate: true,
      composers: ["Minimatic"],
    });
    const main = track({
      id: "main-1",
      title: "Main",
      composers: ["Minimatic"],
      alternateTracks: [alternate],
    });
    const data = buildComposerAudit([album([main, alternate])]);

    expect(data.metrics.trackCount).toBe(2);
    expect(data.credits[0].trackCount).toBe(2);
  });
});
