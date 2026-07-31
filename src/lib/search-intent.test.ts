import { describe, expect, it } from "vitest";
import {
  canonicalizeCategoryValues,
  intentToSearchParams,
  parseSearchIntent,
  resolveIntentCategoryIds,
  resolveSearchBrief,
  searchIntentChips,
} from "./search-intent";
import type { SearchFilterGroup } from "@/types";

describe("parseSearchIntent", () => {
  it("comprend une intention française multi-critères", () => {
    const intent = parseSearchIntent("Une tension électronique lente, sans voix");
    expect(intent.genres).toContain("electronic");
    expect(intent.moods).toContain("tense");
    expect(intent.bpmRange).toEqual([55, 90]);
    expect(intent.isVocal).toBe(false);
  });

  it("comprend une plage BPM explicite et les instruments", () => {
    const intent = parseSearchIntent("Cordes épiques entre 120 à 150 BPM");
    expect(intent.instruments).toContain("strings");
    expect(intent.moods).toContain("epic");
    expect(intent.bpmRange).toEqual([120, 150]);
  });

  it("sérialise un brief structuré sans promettre un filtre vocal indisponible", () => {
    const params = intentToSearchParams(parseSearchIntent("piano calme instrumental"));
    expect(params.get("brief")).toBe("piano calme instrumental");
    expect(params.get("resolve")).toBe("1");
    expect(params.get("q")).toBeNull();
    expect(params.has("vocal")).toBe(false);
  });

  it("comprend une intention anglaise", () => {
    const intent = parseSearchIntent("Slow cinematic tension with strings, no vocals");
    expect(intent.genres).toContain("cinematic");
    expect(intent.moods).toContain("tense");
    expect(intent.instruments).toContain("strings");
    expect(intent.bpmRange).toEqual([55, 90]);
    expect(intent.isVocal).toBe(false);
  });

  it("comprend les styles de club et la présence vocale", () => {
    const intent = parseSearchIntent("Magnetic techno with vocals");
    expect(intent.genres).toContain("techno");
    expect(intent.isVocal).toBe(true);
  });

  it("convertit mariage et wedding vers l'usage Harvest Wedding", () => {
    const groups: SearchFilterGroup[] = [
      { key: "musicFor", label: "Music For", selection: "include-exclude", total: 1, available: 1, items: [{ id: "ATT_wedding", name: "Wedding" }] },
    ];

    for (const brief of ["mariage", "noces", "wedding", "marriage"]) {
      const intent = parseSearchIntent(brief);
      expect(intent.musicFor).toEqual(["wedding"]);
      expect(resolveIntentCategoryIds(intent, groups)).toEqual(["ATT_wedding"]);
      expect(resolveSearchBrief(brief, groups)).toEqual({
        original: brief,
        categoryIds: ["ATT_wedding"],
        criteria: [{ id: "ATT_wedding", group: "musicFor", name: "Wedding" }],
        supported: true,
        source: "parigo-taxonomy",
      });
    }
  });

  it("déclare explicitement un brief inconnu non pris en charge", () => {
    expect(resolveSearchBrief("Armand Dupont", [])).toEqual({
      original: "Armand Dupont",
      categoryIds: [],
      criteria: [],
      supported: false,
      source: "parigo-taxonomy",
    });
  });

  it("respecte les limites de mots et ne confond pas rapide avec rap", () => {
    const intent = parseSearchIntent("Une musique rapide pour un film d’horreur");

    expect(intent.genres).not.toContain("hip-hop");
    expect(intent.moods).toContain("energetic");
    expect(intent.musicFor).toContain("horror-film");
    expect(intent.bpmRange).toEqual([120, 180]);
  });

  it("résout l’horreur vers le critère Harvest Horror Film", () => {
    const groups: SearchFilterGroup[] = [
      { key: "musicFor", label: "Music For", selection: "include-exclude", total: 1, available: 1, items: [{ id: "ATT_horror", name: "Horror Film" }] },
    ];

    expect(resolveSearchBrief("Une musique pour un film d’horreur", groups)).toEqual({
      original: "Une musique pour un film d’horreur",
      categoryIds: ["ATT_horror"],
      criteria: [{ id: "ATT_horror", group: "musicFor", name: "Horror Film" }],
      supported: true,
      source: "parigo-taxonomy",
    });
  });

  it("fusionne les critères trouvés dans une traduction DeepL", () => {
    const groups: SearchFilterGroup[] = [
      { key: "musicFor", label: "Music For", selection: "include-exclude", total: 1, available: 1, items: [{ id: "ATT_horror", name: "Horror Film" }] },
    ];
    const translation = {
      original: "Une musique effrayante",
      effective: "Horror film music",
      source: "machine-translation" as const,
    };

    expect(resolveSearchBrief("Une musique effrayante", groups, translation)).toEqual({
      original: "Une musique effrayante",
      categoryIds: ["ATT_horror"],
      criteria: [{ id: "ATT_horror", group: "musicFor", name: "Horror Film" }],
      translation,
      supported: true,
      source: "parigo-taxonomy",
    });
  });

  it("ne cumule pas des critères structurés de groupes différents", () => {
    const groups: SearchFilterGroup[] = [
      { key: "genre", label: "Genre", selection: "include-exclude", total: 1, available: 1, items: [{ id: "ATT_genre-techno", name: "Techno" }] },
      { key: "moods", label: "Moods", selection: "include-exclude", total: 1, available: 1, items: [{ id: "ATT_mood-energetic", name: "Energetic" }] },
    ];
    const intent = parseSearchIntent("Une techno qui tabasse.");

    expect(resolveIntentCategoryIds(intent, groups)).toEqual(["ATT_genre-techno", "ATT_mood-energetic"]);
    expect(intent.moods).toContain("energetic");
  });

  it("relie le vocabulaire éditorial aux libellés réels de la taxonomie Harvest", () => {
    const groups: SearchFilterGroup[] = [
      { key: "genre", label: "Genre", selection: "include-exclude", total: 1, available: 1, items: [{ id: "ATT_film", name: "Film" }] },
      { key: "moods", label: "Moods", selection: "include-exclude", total: 2, available: 2, items: [{ id: "ATT_cinematic", name: "Cinematic" }, { id: "ATT_tension", name: "Tension" }] },
    ];

    expect(resolveIntentCategoryIds(parseSearchIntent("documentaire cinématique"), groups)).toEqual(["ATT_cinematic"]);
    expect(resolveIntentCategoryIds(parseSearchIntent("fiction sous tension"), groups)).toEqual(["ATT_tension"]);
  });

  it("n'ajoute pas la phrase libre quand des critères structurés seront appliqués", () => {
    const params = intentToSearchParams(parseSearchIntent("Une techno qui tabasse."));

    expect(params.get("q")).toBeNull();
    expect(params.get("brief")).toBe("Une techno qui tabasse.");
    expect(params.get("resolve")).toBe("1");
  });

  it("n'élargit pas une intention inconnue en recherche agrégée", () => {
    const params = intentToSearchParams(parseSearchIntent("Armand Dupont"));

    expect(params.get("brief")).toBe("Armand Dupont");
    expect(params.get("q")).toBeNull();
    expect(params.has("resolve")).toBe(false);
  });

  it("n'affiche comme filtres que les critères réellement applicables", () => {
    const intent = parseSearchIntent("Une techno énergique avec voix entre 120 et 140 BPM");

    expect(searchIntentChips(intent, "fr").map((chip) => chip.label)).toEqual([
      "Techno",
      "Énergique",
      "120–140 BPM",
    ]);
  });

  it("nettoie une ancienne URL où un identifiant inconnu a été sérialisé comme une catégorie", () => {
    const groups: SearchFilterGroup[] = [
      { key: "genre", label: "Genre", selection: "include-exclude", total: 1, available: 1, items: [{ id: "ATT_8c1be9ece2483e34", name: "Techno" }] },
    ];

    expect(canonicalizeCategoryValues(["ATT_8c1be9ece2483e34", "ATT_b80dffcee47aad5c"], groups)).toEqual(["ATT_8c1be9ece2483e34"]);
  });
});
