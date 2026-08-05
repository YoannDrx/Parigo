import { describe, expect, it } from "vitest";
import { resolveAlbumDescription } from "./album-descriptions";
import { mapAlbum } from "./catalog";

const templates = {
  trackStream: "",
  albumArt: "",
  libraryLogo: "",
  playlistArt: "",
  waveformData: "",
  directDownload: "",
};

describe("Harvest album descriptions", () => {
  it("selects the current language, then English, then the compatibility field", () => {
    expect(resolveAlbumDescription({ description: "Legacy", descriptions: { fr: "Français", en: "English" } }, "fr")).toBe("Français");
    expect(resolveAlbumDescription({ description: "Legacy", descriptions: { en: "English" } }, "fr")).toBe("English");
    expect(resolveAlbumDescription({ description: "Legacy" }, "fr")).toBe("Legacy");
  });

  it("keeps Detail as English when Harvest sends no LanguageItems", () => {
    const album = mapAlbum({ ID: "album", Detail: "English detail" }, templates);
    expect(album.description).toBe("English detail");
    expect(album.descriptions).toEqual({ en: "English detail" });
    expect(resolveAlbumDescription(album, "fr")).toBe("English detail");
  });

  it("extracts future FR and EN description LanguageItems", () => {
    const album = mapAlbum({
      ID: "album",
      Detail: "Legacy English",
      LanguageItems: [
        { Type: "AlbumDescription", LanguageCode_ISO639_1: "fr", Value: "Description française" },
        { Type: "Description", LanguageCode: "en-GB", Detail: "English localized" },
        { Type: "AlbumTitle", LanguageCode: "fr", Value: "Titre ignoré" },
      ],
    }, templates);
    expect(album.descriptions).toEqual({ fr: "Description française", en: "English localized" });
    expect(album.description).toBe("English localized");
  });
});
