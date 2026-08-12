import { describe, expect, it } from "vitest";
import { isCatalogIdentifier, isTranslatableSearchQuery, normalizeSearchQuery, stripLegacySearchQuotes } from "./search-query";

describe("title search query normalization", () => {
  it("normalizes case, accents and whitespace", () => {
    expect(normalizeSearchQuery("  MARIÁGE   ")).toBe("mariage");
  });

  it("canonicalizes only matching legacy outer quotes", () => {
    expect(stripLegacySearchQuotes('"crime investigation"')).toBe("crime investigation");
    expect(stripLegacySearchQuotes("l'amour")).toBe("l'amour");
    expect(stripLegacySearchQuotes("'piano' texture")).toBe("'piano' texture");
  });

  it("does not offer machine translation for catalog identifiers or numbers", () => {
    expect(isTranslatableSearchQuery("PAR-001")).toBe(false);
    expect(isTranslatableSearchQuery("PRTM 0212")).toBe(false);
    expect(isTranslatableSearchQuery("KAPL008")).toBe(false);
    expect(isTranslatableSearchQuery("12345")).toBe(false);
    expect(isTranslatableSearchQuery("forêt sombre")).toBe(true);
    expect(isCatalogIdentifier("PRTM 0212")).toBe(true);
    expect(isCatalogIdentifier("KAPL008")).toBe(true);
    expect(isCatalogIdentifier("dark piano")).toBe(false);
  });
});
