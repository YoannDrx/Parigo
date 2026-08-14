import { describe, expect, it } from "vitest";
import { resolveTaxonomyLocalization } from "./catalog";

describe("Harvest taxonomy translations", () => {
  it("reads the live Sad French translation without relying on the misspelled type", () => {
    expect(resolveTaxonomyLocalization({
      ID: "b71182fbd44d6ef6",
      Name: "Sad",
      LanguageItems: [{
        LanguageCode_ISO639_1: "FR",
        Type: "CategoryAtttribute",
        Value: "Triste",
        Default: false,
      }],
    }, "fr")).toEqual({
      name: "Triste",
      hasOfficialLocalization: true,
      emptyValueCount: 0,
      conflictingValues: [],
    });
  });

  it("falls back to the canonical name when no official French value exists", () => {
    expect(resolveTaxonomyLocalization({
      ID: "style-reggae",
      Name: "Reggae",
      LanguageItems: [],
    }, "fr")).toEqual({
      name: "Reggae",
      hasOfficialLocalization: false,
      emptyValueCount: 0,
      conflictingValues: [],
    });
  });

  it("normalizes regional language codes and reports empty or conflicting values", () => {
    expect(resolveTaxonomyLocalization({
      Name: "Sad",
      LanguageItems: [
        { LanguageCode: "fr-FR", Value: "" },
        { CultureCode: "fr_FR", Value: "Triste" },
        { Language: "FR", Value: "Malheureux" },
        { LanguageCode_ISO639_1: "EN", Value: "Sad" },
      ],
    }, "fr")).toEqual({
      name: "Triste",
      hasOfficialLocalization: true,
      emptyValueCount: 1,
      conflictingValues: ["Triste", "Malheureux"],
    });
  });

  it("always keeps Name as the canonical English value", () => {
    expect(resolveTaxonomyLocalization({
      Name: "Sad",
      LanguageItems: [{ LanguageCode_ISO639_1: "FR", Value: "Triste" }],
    }, "en")).toEqual({
      name: "Sad",
      hasOfficialLocalization: false,
      emptyValueCount: 0,
      conflictingValues: [],
    });
  });
});
