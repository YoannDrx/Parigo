import { describe, expect, it } from "vitest";
import {
  collectHarvestComposerCredits,
  composerCreditMatches,
  harvestComposerCreditId,
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
