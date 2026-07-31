import { describe, expect, it } from "vitest";
import { mapAlbum, mapLibraryDescriptions } from "./catalog";

const templates = {
  trackStream: "",
  albumArt: "",
  libraryLogo: "",
  playlistArt: "",
  waveformData: "",
  directDownload: "",
};

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

describe("Harvest album references", () => {
  it("keeps the CDCode field returned by Cloud Search", () => {
    expect(mapAlbum({
      ID: "album-1",
      DisplayTitle: "PRTM 0212 Between Light and Void",
      CDCode: "PRTM 0212",
      LibraryName: "Primetime Tracks",
      TrackCount: 12,
    }, templates)).toMatchObject({
      title: "Between Light and Void",
      code: "PRTM 0212",
    });
  });
});
