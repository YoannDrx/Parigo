import { describe, expect, it } from "vitest";
import { localizePlaylist } from "@/lib/catalog-localization";
import { mapPlaylist } from "./catalog";

const templates = {
  trackStream: "",
  albumArt: "",
  libraryLogo: "",
  playlistArt: "",
  waveformData: "",
  directDownload: "",
};

describe("Harvest featured-playlist translations", () => {
  it("maps names and descriptions returned only by the detail endpoint", () => {
    const playlist = mapPlaylist({
      ID: "a408d52f57e8de96",
      Name: "Discovery - Travel",
      Description: "English description",
      LanguageItems: [
        { Type: "FeaturedPlaylistName", LanguageCode_ISO639_1: "FR", Value: "Découverte - Voyage" },
        { Type: "FeaturedPlaylistDescription", LanguageCode_ISO639_1: "FR", Value: "Description française" },
      ],
    }, templates);

    expect(playlist).toMatchObject({
      title: "Discovery - Travel",
      titles: { en: "Discovery - Travel", fr: "Découverte - Voyage" },
      description: "English description",
      descriptions: { en: "English description", fr: "Description française" },
    });
    expect(localizePlaylist(playlist, "fr")).toMatchObject({
      title: "Découverte - Voyage",
      description: "Description française",
    });
  });

  it("deduplicates identical French descriptions and keeps the first conflicting value", () => {
    const playlist = mapPlaylist({
      ID: "playlist-duplicates",
      Name: "English title",
      LanguageItems: [
        { Type: "FeaturedPlaylistDescription", LanguageCode: "fr-FR", Value: "Même description" },
        { Type: "FeaturedPlaylistDescription", LanguageCode: "FR", Value: "Même description" },
        { Type: "FeaturedPlaylistDescription", LanguageCode: "fr", Value: "Valeur concurrente" },
      ],
    }, templates);

    expect(playlist.descriptions).toEqual({ fr: "Même description" });
  });

  it("falls back to English when a French playlist name is absent", () => {
    const playlist = mapPlaylist({ ID: "brand", Name: "Brand - New Media" }, templates);
    expect(localizePlaylist(playlist, "fr").title).toBe("Brand - New Media");
  });
});
