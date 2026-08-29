import { describe, expect, it } from "vitest";
import { labelMatchesQuery, normalizeLabelSearchValue } from "./label-search";

const parigo = {
  name: "Parigo",
  description: "Catalogue original français",
  references: ["PGO", "PGO0056"],
};

describe("labelMatchesQuery", () => {
  it("matches a label reference independently from the label name", () => {
    expect(labelMatchesQuery(parigo, "PGO", "fr")).toBe(true);
    expect(labelMatchesQuery({ name: "Primetime Tracks", references: ["PRTM 0214"] }, "PRTM", "fr")).toBe(true);
  });

  it("matches combined name and reference terms in any order", () => {
    expect(labelMatchesQuery(parigo, "PGO Parigo", "fr")).toBe(true);
    expect(labelMatchesQuery(parigo, "parigo pgo", "fr")).toBe(true);
  });

  it("normalizes accents, punctuation and spacing", () => {
    expect(normalizeLabelSearchValue("  Réf. PRTM-0214  ", "fr")).toBe("ref prtm 0214");
  });

  it("rejects an unrelated reference", () => {
    expect(labelMatchesQuery(parigo, "PRTM", "fr")).toBe(false);
  });
});
