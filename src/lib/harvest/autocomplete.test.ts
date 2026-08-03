import { describe, expect, it } from "vitest";
import { buildAutocompletePayload, mapAutocompleteResponse } from "./autocomplete";

describe("Harvest autocomplete", () => {
  it("requests only strict track-title suggestions for the active view", () => {
    const payload = buildAutocompletePayload("crime", "tracks");
    expect(payload).toMatchObject({
      Keyword: "crime",
      ReturnTracks: true,
      ReturnTracks_MainOnly: true,
      ReturnTracks_Fields: "DisplayTitle",
      ReturnTracks_DisableKeywordGroup: true,
      ReturnTracks_Limit: 10,
      ReturnAlbums: false,
      ReturnLibraries: false,
      ReturnRightHolders: false,
      ReturnFeaturedPlaylists: false,
      ReturnStyles: false,
    });
  });

  it("switches the strict autocomplete field to albums", () => {
    expect(buildAutocompletePayload("crime", "albums")).toMatchObject({
      ReturnTracks: false,
      ReturnAlbums: true,
      ReturnAlbums_Fields: "DisplayTitle",
      ReturnAlbums_DisableKeywordGroup: true,
    });
  });

  it("normalizes entities, filters stems and does not expose a style group", () => {
    const groups = mapAutocompleteResponse({
      TracksFound: 2,
      Tracks: [
        { TrackID: "track-main", AlbumID: "album-1", DisplayTitle: "Crime Scene", Version: "Main", CDCode: "PAR001" },
        { TrackID: "track-stem", AlbumID: "album-1", DisplayTitle: "Crime Scene_Piano Stem", Version: "Piano Stem" },
      ],
      AlbumsFound: 1,
      Albums: [{ AlbumID: "album-1", DisplayTitle: "Crime Stories", CDCode: "PAR001" }],
      FeaturedPlaylistsFound: 1,
      FeaturedPlaylists: [{ FeaturedPlaylistID: "playlist-1", Name: "Investigation — Crime" }],
      LibrariesFound: 1,
      Libraries: [{ LibraryID: "label-1", Name: "Parigo" }],
      RightHolderFound: 1,
      rightHolders: [{ RightHolderID: "composer-1", firstname: "Jane", lastname: "Doe" }],
      KeywordsFound: 1,
      Keywords: ["crime"],
      StylesFound: 1,
      Styles: [{ StyleID: "style-1", Name: "Crime" }],
    });

    expect(groups.map((group) => group.key)).toEqual(["tracks", "albums", "playlists", "labels", "composers", "words"]);
    expect(groups.find((group) => group.key === "tracks")?.items).toHaveLength(1);
    expect(groups.find((group) => group.key === "tracks")?.items[0]).toMatchObject({
      id: "track-main",
      href: "/albums/album-1?track=track-main",
    });
    expect(groups.find((group) => group.key === "composers")?.items[0]).toMatchObject({
      label: "Jane Doe",
      href: "/search?view=tracks&type=main&composer=Jane%20Doe",
    });
    expect(groups.some((group) => (group.key as string) === "styles")).toBe(false);
  });

  it("returns stable empty groups for an invalid response", () => {
    expect(mapAutocompleteResponse(null).every((group) => group.count === 0 && group.items.length === 0)).toBe(true);
  });
});
