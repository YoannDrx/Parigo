import { describe, expect, it } from "vitest";
import type { Album, Track } from "@/types";
import {
  arePotentialComposerSpellings,
  buildComposerAudit,
  composerAuditBaseName,
} from "./composer-audit";
import { recommendComposerCreditName } from "./composer-naming";

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

function album(tracks: Track[], code = "PGO0050"): Album & { tracks: Track[] } {
  return {
    id: `album-${code}`,
    code,
    title: `Album ${code}`,
    label: "Parigo",
    cover: "/cover.jpg",
    genres: [],
    trackCount: tracks.length,
    tracks,
  };
}

function identityByName(data: ReturnType<typeof buildComposerAudit>, name: string) {
  const identity = data.identities.find((item) => item.preferredName === name);
  expect(identity, `Identité introuvable : ${name}`).toBeDefined();
  return identity!;
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

  it("regroupe deux variantes exactes dans une identité résolue", () => {
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
    ])]);

    expect(identityByName(data, "Minimatic")).toMatchObject({
      source: "public-profile",
      trackCount: 2,
      albumCount: 1,
      harvestStatus: "cleanup-required",
      exactCredits: [
        { name: "Minimatic", trackCount: 1 },
        { name: "Minimatic (NS)", trackCount: 1 },
      ],
    });
  });

  it("ne conserve aucune recommandation historique après une correction effective", () => {
    const data = buildComposerAudit([
      album([track({ id: "2080", title: "Machine", composers: ["2080"], rightHolders: [{ id: "h1", name: "2080", capacity: "Composer" }] })], "PGO0045"),
      album([track({ id: "flore", title: "Liquid", composers: ["Flore Morfin"], rightHolders: [{ id: "h2", name: "Flore Morfin", capacity: "Composer" }] })], "PGO0049"),
      album([track({ id: "arom", title: "Cloud", composers: ["Amaury Messelier"], rightHolders: [{ id: "h3", name: "Amaury Messelier", capacity: "Composer" }] })], "PGO0035"),
    ]);

    for (const name of ["2080", "Flore Morfin", "Amaury Messelier"]) {
      expect(identityByName(data, name)).toMatchObject({ harvestStatus: "clean", recommendations: [] });
    }
  });

  it("propose le nom préféré du registre pour une inversion connue", () => {
    const data = buildComposerAudit([album([track({
      id: "molenat",
      title: "Cavaliers",
      composers: ["Molenat Alexis (SACEM)"],
      rightHolders: [{ id: "holder", name: "Molenat Alexis", capacity: "Composer" }],
    })], "PGO0033")]);

    const identity = identityByName(data, "Alexis Molenat");
    expect(identity.harvestStatus).toBe("cleanup-required");
    expect(identity.recommendations).toEqual(expect.arrayContaining([
      expect.objectContaining({ proposedName: "Alexis Molenat", evidence: "canonical-registry" }),
    ]));
  });

  it("garde les membres d’un collectif dans des identités distinctes", () => {
    const composers = ["Jean-Michel Vallet", "Claire Michael", "Patrick Chartol"];
    const data = buildComposerAudit([album([track({
      id: "collective",
      title: "After",
      composers,
      rightHolders: composers.map((name, index) => ({ id: `holder-${index}`, name, capacity: "Composer" })),
    })], "PGO0031")]);

    const members = data.identities.filter((identity) => identity.publicProfile?.slug === "after-in-paris" && identity.trackCount);
    expect(members.map((identity) => identity.preferredName).sort()).toEqual([...composers].sort());
  });

  it("classe les contributeurs inconnus en Harvest uniquement et signale les caractères corrompus", () => {
    const data = buildComposerAudit([album([track({
      id: "unknown",
      title: "Unknown",
      composers: ["Sosth�ne Fanou (NS)"],
      rightHolders: [{ id: "holder", name: "Sosth�ne Fanou", capacity: "Composer" }],
    })], "PGO0036")]);
    const identity = identityByName(data, "Sosth�ne Fanou");
    expect(identity).toMatchObject({ source: "harvest-only", editorialStatus: "not-applicable", harvestStatus: "review-required" });
    expect(identity.recommendations.some((item) => item.kind === "invalid-character")).toBe(true);
  });

  it("regroupe les variantes de casse et d’accent d’un contributeur Harvest seul", () => {
    const data = buildComposerAudit([album([
      track({ id: "case-1", title: "Version 1", composers: ["Émile Martin"] }),
      track({ id: "case-2", title: "Version 2", composers: ["EMILE MARTIN"] }),
    ], "PGO0040")]);

    const matches = data.identities.filter((identity) => identity.exactCredits.some((credit) => (
      credit.name === "Émile Martin" || credit.name === "EMILE MARTIN"
    )));
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ source: "harvest-only", trackCount: 2, harvestStatus: "review-required" });
  });

  it("ne propose aucune cible automatique lorsque les ayants droit se contredisent", () => {
    const data = buildComposerAudit([album([track({
      id: "contradiction",
      title: "Contradiction",
      composers: ["Minimatic (NS)"],
      rightHolders: [{ id: "holder", name: "Une autre personne", capacity: "Composer" }],
    })])]);

    const identity = identityByName(data, "Minimatic");
    expect(identity.harvestStatus).toBe("review-required");
    expect(identity.recommendations.some((item) => item.proposedName)).toBe(false);
    expect(identity.recommendations).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "different-right-holders", severity: "review" }),
    ]));
    expect(recommendComposerCreditName("Minimatic (NS)", {
      preferredName: "Minimatic",
      structuredWriterNames: ["Une autre personne"],
      hasContradictoryEvidence: true,
    }).proposedName).toBeUndefined();
  });

  it("rattache un Composer vide à un ayant droit canonique sans masquer les contradictions", () => {
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
        composers: ["Flore Morfin"],
        rightHolders: [{ id: "holder-2", name: "Autre Personne", capacity: "Composer" }],
      }),
      track({ id: "track-no-holder", title: "Version courte", composers: ["Minimatic"], rightHolders: [] }),
    ])]);

    expect(identityByName(data, "Minimatic").recommendations).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "missing-public-credit", proposedName: "Minimatic" }),
    ]));
    expect(data.metrics).toMatchObject({ missingPublicCreditCount: 1, differentRightHoldersCount: 1, missingStructuredCreditCount: 1 });
  });

  it("déduplique les versions déjà présentes à plat tout en parcourant les versions imbriquées", () => {
    const alternate = track({ id: "alternate-1", title: "Main 30 sec", isAlternate: true, mainTrackId: "main-1", composers: ["Minimatic"] });
    const main = track({ id: "main-1", title: "Main", composers: ["Minimatic"], alternateTracks: [alternate] });
    const data = buildComposerAudit([album([main, alternate])]);
    expect(data.metrics.trackCount).toBe(2);
    expect(identityByName(data, "Minimatic")).toMatchObject({ trackCount: 1, variantCount: 2, albumCount: 1 });
    expect(identityByName(data, "Minimatic").albums[0].works[0].tracks).toHaveLength(2);
  });

  it("regroupe plusieurs stems et signale une version sans MainTrackID", () => {
    const data = buildComposerAudit([album([
      track({ id: "main", title: "Main", composers: ["Minimatic"] }),
      track({ id: "stem-1", title: "Drums", isAlternate: true, variantKind: "stem", mainTrackId: "main", composers: ["Minimatic"] }),
      track({ id: "stem-2", title: "Bass", isAlternate: true, variantKind: "stem", mainTrackId: "main", composers: ["Minimatic"] }),
      track({ id: "orphan", title: "Orphan", isAlternate: true, composers: ["Minimatic"] }),
    ])]);
    const identity = identityByName(data, "Minimatic");
    expect(identity).toMatchObject({ trackCount: 1, variantCount: 4, harvestStatus: "review-required" });
    expect(identity.recommendations).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "orphan-variant" })]));
    expect(identity.albums[0].works).toHaveLength(2);
  });
});
