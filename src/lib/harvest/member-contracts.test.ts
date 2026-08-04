import { describe, expect, it } from "vitest";
import {
  buildAddTracksToTags,
  buildAddTracksToPlaylists,
  buildCreateMemberPlaylist,
  buildCueSheetTracks,
  buildCopyFeaturedPlaylist,
  buildDownloadRequest,
  buildDownloadValidation,
  buildRemovePlaylistTracks,
  buildUpdateMemberPlaylist,
  buildPlaylistShare,
  buildPlaylistSuggestions,
  buildReorderPlaylistTracks,
  buildSavedSearch,
  buildSavedSearchQuery,
  buildCreateTrackComment,
  buildUpdateTrackComment,
  buildMemberRegistration,
  buildMemberRemoval,
  buildMemberSubscription,
  buildMemberVerificationEmail,
  buildPasswordResetEmail,
  buildPasswordUpdate,
  buildPersistentLogin,
  buildCommunicationHistory,
  buildDuplicateMemberPlaylist,
  buildPlaylistCategory,
  buildSearchMemberPlaylistTracks,
  buildUpdatePlaylistCategory,
  buildUpdateSavedSearch,
} from "./member-contracts";

describe("Harvest member request contracts", () => {
  it("serializes the documented registration wrapper", () => {
    const payload = buildMemberRegistration({
      email: "member@example.invalid", password: "Secret123", firstName: "Test", lastName: "Member",
      country: "FR", privacyAccepted: true, subscribe: true, fileFormatId: "mp3-320",
    });
    expect(payload).toMatchObject({
      MemberAccount: {
        Username: "member@example.invalid", Email: "member@example.invalid", TermsAccept: true,
        PrivacyAccept: true, Subscribe: true, FileFormat: "mp3-320", SearchFormat: "Track", SearchSort: "New",
      },
      NoMemberEmail: true, VerifierEmail: "", RegistrationCode: "",
    });
  });

  it("locks persistent login, newsletter and reset shapes", () => {
    expect(buildPersistentLogin("persistent-token")).toEqual({ Token: "persistent-token", RenewExpiry: true, GenerateMemberToken: true, ReturnMemberDetails: true });
    expect(buildMemberSubscription({ firstName: "Test", lastName: "Member", email: "member@example.invalid" }, false)).toEqual({ FirstName: "Test", LastName: "Member", Email: "member@example.invalid", Subscribe: false });
    expect(buildPasswordResetEmail("member@example.invalid")).toEqual({ Username: "", Email: "member@example.invalid" });
    expect(buildMemberVerificationEmail("member@example.invalid")).toEqual({ Email: "member@example.invalid", ExternalVerifyToken: "" });
    expect(buildPasswordUpdate("reset-token", "Secret123")).toEqual({ Token: "reset-token", Password: "Secret123" });
  });

  it("uses Harvest object and tag ID arrays without aliases", () => {
    expect(buildAddTracksToTags(["tag-1"], ["track-1", "track-2"])).toEqual({ ObjectType: "Track", ObjectIDs: ["track-1", "track-2"], AddToTagIDs: ["tag-1"] });
  });

  it("uses the documented Harvest member playlist contracts without aliases", () => {
    expect(buildCreateMemberPlaylist("Piano intime", "Montage final")).toEqual({
      requestaddupdateplaylist: {
        playlistname: "Piano intime",
        playlistdescription: "Montage final",
        playlisttags: "",
        highlighttracks: false,
        autosave: false,
        autosavelimit: 0,
        autosaveapplytohighlighttracks: false,
        playlistcategoryid: "",
        externalplaylistimageurl: "",
        orderby: "",
      },
    });
    expect(buildUpdateMemberPlaylist("Piano intime", "Montage final")).toEqual({
      playlistname: "Piano intime",
      playlistdescription: "Montage final",
      playlisttags: "",
      highlighttracks: false,
      autosave: false,
      autosavelimit: 0,
      autosaveapplytohighlighttracks: false,
      playlistcategoryid: "",
      externalplaylistimageurl: "",
      orderby: "",
    });
    expect(buildCopyFeaturedPlaylist("featured-1")).toEqual({
      PlaylistID: "featured-1",
      CopyTracks: true,
    });
    expect(buildAddTracksToPlaylists(["playlist-1"], ["track-1", "track-2"])).toEqual({
      ObjectType: "Track",
      ObjectIDs: ["track-1", "track-2"],
      AddToPlaylistIDs: ["playlist-1"],
      ObjectTrimStart: null,
      ObjectTrimEnd: null,
      AddToAutoSavePlaylists: false,
    });
    expect(buildRemovePlaylistTracks(["track-1", "track-2"])).toEqual({
      track: [{ id: "track-1" }, { id: "track-2" }],
    });
    expect(buildCueSheetTracks(["track-1", "track-2"])).toEqual({
      track: ["track-1", "track-2"],
    });
    expect(buildReorderPlaylistTracks("playlist-1", ["track-2"], { succeedingTrackId: "track-1" })).toEqual({
      FromPlaylistID: "playlist-1",
      ToPlaylistID: "playlist-1",
      TrackIDs: "track-2",
      SucceedingTrackID: "track-1",
      Copy: false,
    });
    expect(() => buildReorderPlaylistTracks("playlist-1", ["track-1"], {})).toThrow(TypeError);
  });

  it("uses the documented Harvest download field names", () => {
    expect(buildDownloadValidation(["track-1", "track-2"], "format-1", true)).toEqual({
      Identifier: "track-1,track-2",
      ContentIDs: "",
      DownloadType: "track",
      Format: ["format-1"],
      TrimEndSecs: 0,
      TrimStartSecs: 0,
      IncludeVersionCheck: true,
    });
    expect(buildDownloadRequest(["track-1"], "format-1", "member@example.invalid")).toEqual({
      Identifier: "track-1",
      DownloadType: "track",
      Format: "format-1",
      TrimStartSecs: 0,
      TrimEndSecs: 0,
      Email: "member@example.invalid",
      IsShare: false,
      Message: "",
      SenderEmail: "member@example.invalid",
      ForceEmail: false,
      IncludeVersions: false,
      VersionFolderName: "",
      DownloadFileName: "",
      CuesheetFileName: "",
      IncludeCuesheetFile: true,
    });
  });

  it("serializes saved searches, private notes and playlist suggestions", () => {
    expect(buildSavedSearch("Piano intime", "PARIGO_URL:/search?q=piano", "history-1")).toEqual({
      Name: "Piano intime", Description: "PARIGO_URL:/search?q=piano", SearchHistoryID: "history-1",
    });
    expect(buildSavedSearchQuery()).toEqual({ Keywords: "", Skip: 0, Limit: 100, Sort: "Created_Desc" });
    expect(buildUpdateSavedSearch("saved-1", "Piano renommé", "PARIGO_URL:/search?q=piano")).toEqual({
      ID: "saved-1",
      Name: "Piano renommé",
      Description: "PARIGO_URL:/search?q=piano",
      SearchHistoryID: "",
    });
    expect(buildCreateTrackComment("track-1", "À tester sur le montage")).toEqual({
      trackid: "track-1",
      tagname: "À tester sur le montage",
    });
    expect(buildUpdateTrackComment("comment-1", "track-1", "Validé pour le montage")).toEqual({
      tagid: "comment-1",
      trackid: "track-1",
      tagname: "Validé pour le montage",
    });
    expect(buildPlaylistSuggestions(12)).toEqual({ Skip: 0, Limit: 12, MainOnly: true, SeedDetermination: "Random", SeedLimit: 5, SeedMin: "" });
  });

  it("serializes verified member removal without leaking the token into the body", () => {
    expect(buildMemberRemoval("current-password", false)).toEqual({
      Password: "current-password",
      ArchiveOnly: false,
    });
    expect(buildMemberRemoval("current-password", true)).toEqual({
      Password: "current-password",
      ArchiveOnly: true,
    });
  });

  it("serializes playlist organisation, duplication and server search contracts", () => {
    expect(buildPlaylistCategory("Client A", "Campagne", "#AABBCC", true)).toEqual({
      PlaylistCategoryName: "Client A",
      PlaylistCategoryDescription: "Campagne",
      ColorHex: "#AABBCC",
      AddToTop: true,
    });
    expect(buildUpdatePlaylistCategory("Client B", "Archives", "#112233")).toEqual({
      PlaylistCategoryName: "Client B",
      PlaylistCategoryDescription: "Archives",
      ColorHex: "#112233",
    });
    expect(buildDuplicateMemberPlaylist("playlist-1", "Copie")).toEqual({
      SourcePlaylistID: "playlist-1",
      DuplicatePlaylistName: "Copie",
    });
    expect(buildSearchMemberPlaylistTracks("piano", { skip: 10, limit: 20, orderBy: "Title_Asc" })).toEqual({
      Keyword: "piano",
      Fields: "TrackDisplayTitle,TrackDescription",
      ReturnTrackCount: true,
      Skip: 10,
      Limit: 20,
      OrderBy: "Title_Asc",
    });
  });

  it("serializes communication history", () => {
    expect(buildCommunicationHistory({ limit: 25, startDate: "2026-07-01", endDate: "2026-07-29" })).toEqual({
      Skip: 0,
      Limit: 25,
      Sort: "Created_Desc",
      StartDate: "2026-07-01",
      EndDate: "2026-07-29",
    });
  });

  it("keeps advanced playlist sharing permissions explicit", () => {
    expect(buildPlaylistShare({
      fromMemberToken: "sender", username: "member@example.invalid", recipientType: "MemberAccount", playlistId: "playlist-1",
      allowDownload: true, allowFollow: false, allowSave: true, allowShare: false,
    })).toEqual({
      FromMemberToken: "sender", ObjectIdentifier: "playlist-1", ObjectType: "Playlist",
      Users: [{ Username: "member@example.invalid", Type: "MemberAccount", ShareType: "Sync", AllowDownload: true, AllowFollow: false, AllowSave: true, AllowShare: false, AllowCollaboration: false, AllowEdit: false }],
    });
    expect(buildPlaylistShare({
      fromMemberToken: "sender", username: "guest@example.invalid", recipientType: "GuestMemberAccount", playlistId: "playlist-1",
      allowDownload: false, allowFollow: false, allowSave: false, allowShare: false,
    }).Users[0]).toMatchObject({ Username: "", Type: "GuestMemberAccount", ShareType: "Sync" });
  });
});
