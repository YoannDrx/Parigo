import { describe, expect, it } from "vitest";
import {
  buildAddTracksToTags,
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
});
