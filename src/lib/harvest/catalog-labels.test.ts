import { describe, expect, it } from "vitest";
import { mapLibraryDescriptions } from "./catalog";

describe("Harvest label translations", () => {
  it("maps the live LanguageItems contract by ISO language code", () => {
    expect(mapLibraryDescriptions({
      LanguageItems: [
        {
          LanguageCode_ISO639_1: "FR",
          Type: "LibraryDescription",
          Value: "Description française",
          Default: false,
        },
        {
          LanguageCode_ISO639_1: "EN",
          Type: "LibraryDescription",
          Value: "English description",
          Default: true,
        },
        {
          LanguageCode_ISO639_1: "FR",
          Type: "LibraryName",
          Value: "Nom localisé",
        },
      ],
    })).toEqual({
      fr: "Description française",
      en: "English description",
    });
  });
});
