import { describe, expect, it } from "vitest";
import {
  buildAddTracksToTags,
  buildPlaylistShare,
  buildPlaylistSuggestions,
  buildSavedSearch,
  buildSavedSearchQuery,
  buildTrackComment,
  buildMemberRegistration,
  buildMemberSubscription,
  buildPasswordResetEmail,
  buildPasswordUpdate,
  buildPersistentLogin,
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
    expect(buildPasswordResetEmail("member@example.invalid")).toEqual({ Username: "", Email: "member@example.invalid", ExternalResetToken: "" });
    expect(buildPasswordUpdate("reset-token", "Secret123")).toEqual({ Token: "reset-token", Password: "Secret123" });
  });

  it("uses Harvest object and tag ID arrays without aliases", () => {
    expect(buildAddTracksToTags(["tag-1"], ["track-1", "track-2"])).toEqual({ ObjectType: "Track", ObjectIDs: ["track-1", "track-2"], AddToTagIDs: ["tag-1"] });
  });

  it("serializes saved searches, private notes and playlist suggestions", () => {
    expect(buildSavedSearch("Piano intime", "PARIGO_URL:/search?q=piano", "history-1")).toEqual({
      Name: "Piano intime", Description: "PARIGO_URL:/search?q=piano", SearchHistoryID: "history-1",
    });
    expect(buildSavedSearchQuery()).toEqual({ Keywords: "", Skip: 0, Limit: 100, Sort: "Created_Desc" });
    expect(buildTrackComment("track-1", "À tester sur le montage")).toEqual({ TrackID: "track-1", TagName: "À tester sur le montage" });
    expect(buildPlaylistSuggestions(12)).toEqual({ Skip: 0, Limit: 12, MainOnly: true, SeedDetermination: "Created_Desc", SeedLimit: 5, SeedMin: "" });
  });

  it("keeps advanced playlist sharing permissions explicit", () => {
    expect(buildPlaylistShare({
      fromMemberToken: "sender", toMemberToken: "recipient", playlistId: "playlist-1", shareType: "Sync",
      allowDownload: true, allowFollow: false, allowSave: true, allowShare: false,
    })).toEqual({
      FromMemberToken: "sender", ToMemberToken: "recipient", ObjectIdentifier: "playlist-1", ObjectType: "Playlist",
      ShareType: "Sync", AllowDownload: true, AllowFollow: false, AllowSave: true, AllowShare: false,
    });
  });
});
