import { describe, expect, it } from "vitest";
import {
  collectHarvestComposerSearchItems,
  collectHarvestComposerCredits,
  composerCreditMatches,
  harvestComposerCreditId,
  harvestComposerCreditNames,
  normalizeHarvestComposerCredit,
  normalizeHarvestComposerSearchValue,
} from "./composer-credits";

describe("Harvest composer credits", () => {
  it("conserve chaque variante brute sous un identifiant stable", () => {
    const plain = harvestComposerCreditId("Fabien Girard");
    const society = harvestComposerCreditId("Fabien Girard (SACEM)");

    expect(plain).toBe(harvestComposerCreditId("Fabien Girard"));
    expect(plain).not.toBe(society);
    expect(plain).toMatch(/^harvest-fabien-girard-/);
  });

  it("preserves rights-society suffixes when searching raw credits", () => {
    expect(normalizeHarvestComposerSearchValue("Éric Débris (SACEM)")).toBe("eric debris sacem");
    expect(normalizeHarvestComposerSearchValue("Éric Débris (NS)")).toBe("eric debris ns");
  });

  it("regroupe les variantes de société sans limiter la recherche au registre Parigo", () => {
    const tracks = [
      { id: "track-1", composers: ["Amaury Messelier", "Amaury Messelier (SACEM)"] },
      { id: "track-2", composers: ["Amaury Messelier (NS)"] },
      { id: "track-3", composers: ["Compositrice Hors Registre (BMI)"] },
    ];

    expect(collectHarvestComposerSearchItems(tracks, "Amaury")).toEqual([
      { id: "Amaury Messelier", name: "Amaury Messelier", count: 2 },
    ]);
    expect(collectHarvestComposerSearchItems(tracks, "Hors Registre")).toEqual([
      { id: "Compositrice Hors Registre", name: "Compositrice Hors Registre", count: 1 },
    ]);
  });

  it("extrait et regroupe globalement les personnes des crédits composites Harvest", () => {
    expect(harvestComposerCreditNames("Pendle Poucher / Laurent Dury")).toEqual([
      "Pendle Poucher",
      "Laurent Dury",
    ]);
    expect(harvestComposerCreditNames("248219461) 25% / Laurent Dury (SACEM")).toEqual([
      "Laurent Dury",
    ]);
    expect(harvestComposerCreditNames("James Wordsworth  PRS")).toEqual([
      "James Wordsworth",
    ]);
    expect(harvestComposerCreditNames("Kjetil Rostad (TONO")).toEqual([
      "Kjetil Rostad",
    ]);

    const tracks = [
      { id: "track-1", composers: ["Laurent Dury"] },
      { id: "track-2", composers: ["Pendle Poucher / Laurent Dury"] },
      { id: "track-3", composers: ["248219461) 25% / Laurent Dury (SACEM"] },
      { id: "track-4", composers: ["Pendle Poucher (PRS"] },
    ];

    expect(collectHarvestComposerSearchItems(tracks, "Dury")).toEqual([
      { id: "Laurent Dury", name: "Laurent Dury", count: 3 },
    ]);
    expect(collectHarvestComposerSearchItems(tracks, "Poucher")).toEqual([
      { id: "Pendle Poucher", name: "Pendle Poucher", count: 2 },
    ]);
  });

  it("agrège les pistes et albums sans fusionner les libellés Harvest", () => {
    const credits = collectHarvestComposerCredits([
      {
        id: "track-1",
        albumId: "album-1",
        albumCode: "PGO0001",
        albumTitle: "Premier album",
        composers: ["Fabien Girard", "Fabien Girard (SACEM)"],
      },
      {
        id: "track-2",
        albumId: "album-1",
        albumCode: "PGO0001",
        albumTitle: "Premier album",
        composers: ["Fabien Girard"],
      },
    ]);

    expect(credits).toHaveLength(2);
    expect(credits.find((credit) => credit.name === "Fabien Girard")).toMatchObject({
      trackCount: 2,
      albumCodes: ["PGO0001"],
    });
    expect(credits.find((credit) => credit.name === "Fabien Girard (SACEM)")).toMatchObject({
      trackCount: 1,
      albumCodes: ["PGO0001"],
    });
  });

  it("rapproche un profil seulement après normalisation conservative", () => {
    const credits = [{ normalized: normalizeHarvestComposerCredit("Éric Débris (SACEM)") }];

    expect(composerCreditMatches(["Eric Debris"], credits)).toBe(true);
    expect(composerCreditMatches(["Eric Debrix"], credits)).toBe(false);
  });
});
