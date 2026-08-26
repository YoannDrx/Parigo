import { describe, expect, it } from "vitest";
import { mapAlbum, mapLibraryDescriptions, mapTrack, mergeLibraryDescriptions } from "./catalog";

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

  it("merges locale-switched getlibrary Detail values", () => {
    expect(mergeLibraryDescriptions(
      { Detail: "English library detail", LanguageItems: [] },
      { Detail: "Description française", LanguageItems: [] },
    )).toEqual({ en: "English library detail", fr: "Description française" });
  });

  it("does not invent a French value when Harvest repeats the English fallback", () => {
    expect(mergeLibraryDescriptions(
      { Detail: "English fallback" },
      { Detail: "English fallback" },
    )).toEqual({ en: "English fallback" });
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

describe("Harvest track author credits", () => {
  it("keeps stable Harvest right-holder IDs even when detailed credits are absent", () => {
    expect(mapTrack({
      ID: "track-with-holder-ids",
      DisplayTitle: "An indexed song",
      RightHolderIDs: [{ ID: "composer-1" }, { ID: "author-1" }],
    }, templates)).toMatchObject({
      rightHolderIds: ["composer-1", "author-1"],
    });
  });

  it("derives authors from the structured Harvest right-holder capacity", () => {
    expect(mapTrack({
      ID: "track-1",
      DisplayTitle: "A vocal song",
      RightHolders: [
        { ID: "composer-1", Name: "A Composer", Capacity: "Composer" },
        { ID: "author-1", FirstName: "An", LastName: "Author", Capacity: "Author" },
        { ID: "publisher-1", Name: "A Publisher", Capacity: "Original Publisher" },
      ],
    }, templates)).toMatchObject({
      authors: ["An Author"],
    });
  });

  it("does not invent an author when Harvest only returns composers", () => {
    expect(mapTrack({
      ID: "track-2",
      DisplayTitle: "An instrumental",
      RightHolders: [
        { ID: "composer-1", Name: "A Composer", Capacity: "Composer" },
      ],
    }, templates)).toMatchObject({
      authors: [],
    });
  });

  it("maps useful AIMS passages without exposing zero confidence as a score", () => {
    expect(mapTrack({
      ID: "track-aims-1",
      DisplayTitle: "A similar track",
      EvokeSegments: [
        { Start: 12.5, Length: 24, Score: 0 },
        { Start: 48, Length: 18, Score: 0.72 },
        { Start: 80, Length: 0, Score: 1 },
      ],
    }, templates).similaritySegments).toEqual([
      { start: 12.5, duration: 24 },
      { start: 48, duration: 18, score: 0.72 },
    ]);
  });
});
