import { describe, expect, it } from "vitest";
import { canonicalizeCategoryValues, intentToSearchParams, parseSearchIntent, resolveIntentCategoryIds, searchIntentChips } from "./search-intent";
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

  it("ne cumule pas un genre et un style portant tous les deux le nom Techno", () => {
    const groups: SearchFilterGroup[] = [
      { key: "genre", label: "Genre", selection: "include-exclude", total: 1, available: 1, items: [{ id: "ATT_genre-techno", name: "Techno" }] },
      { key: "moods", label: "Moods", selection: "include-exclude", total: 1, available: 1, items: [{ id: "ATT_mood-energetic", name: "Energetic" }] },
      { key: "styles", label: "Styles", selection: "include-exclude", total: 1, available: 1, items: [{ id: "style-techno", name: "Techno" }] },
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

  it("conserve une recherche littérale quand aucun critère structuré n'est compris", () => {
    const params = intentToSearchParams(parseSearchIntent("Armand Dupont"));

    expect(params.get("brief")).toBe("Armand Dupont");
    expect(params.get("q")).toBe("Armand Dupont");
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

  it("nettoie une ancienne URL où un style a été sérialisé comme une catégorie", () => {
    const groups: SearchFilterGroup[] = [
      { key: "genre", label: "Genre", selection: "include-exclude", total: 1, available: 1, items: [{ id: "ATT_8c1be9ece2483e34", name: "Techno" }] },
      { key: "styles", label: "Styles", selection: "include-exclude", total: 1, available: 1, items: [{ id: "b80dffcee47aad5c", name: "Techno" }] },
    ];

    expect(canonicalizeCategoryValues(["ATT_8c1be9ece2483e34", "ATT_b80dffcee47aad5c"], groups)).toEqual(["ATT_8c1be9ece2483e34"]);
  });
});
