import "server-only";

import type { MemberProfile } from "@/types";

export interface RegistrationContractInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  country: string;
  company?: string;
  subscribe?: boolean;
  production?: string;
  subProduction?: string;
  position?: string;
  address1?: string;
  address2?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  phone?: string;
  fileFormatId?: string;
  privacyAccepted: boolean;
}

export function buildMemberRegistration(input: RegistrationContractInput) {
  return {
    MemberAccount: {
      Username: input.email,
      Email: input.email,
      Password: input.password,
      FirstName: input.firstName,
      LastName: input.lastName,
      Company: input.company || "",
      Country: input.country,
      Production: input.production || "",
      SubProduction: input.subProduction || "",
      Position: input.position || "",
      Address1: input.address1 || "",
      Address2: input.address2 || "",
      Suburb: input.suburb || "",
      State: input.state || "",
      Postcode: input.postcode || "",
      Phone: input.phone || "",
      FileFormat: input.fileFormatId || "mp3",
      SearchFormat: "Track",
      SearchSort: "New",
      TermsAccept: true,
      PrivacyAccept: input.privacyAccepted,
      Subscribe: Boolean(input.subscribe),
      Attributes: [],
      ExternalMemberID: "",
      ExternalVerifyToken: "",
    },
    NoMemberEmail: true,
    VerifierEmail: "",
    RegistrationCode: "",
  };
}

export function buildPersistentLogin(token: string) {
  return { Token: token, RenewExpiry: true, GenerateMemberToken: true, ReturnMemberDetails: true };
}

export function buildMemberSubscription(profile: Pick<MemberProfile, "firstName" | "lastName" | "email">, subscribed: boolean) {
  return { FirstName: profile.firstName, LastName: profile.lastName, Email: profile.email, Subscribe: subscribed };
}

export function buildPasswordResetEmail(email: string) {
  return { Username: "", Email: email, ExternalResetToken: "" };
}

export function buildPasswordUpdate(token: string, password: string) {
  return { Token: token, Password: password };
}

export function buildAddTracksToTags(tagIds: string[], trackIds: string[]) {
  return { ObjectType: "Track", ObjectIDs: trackIds, AddToTagIDs: tagIds };
}

export function buildSavedSearch(name: string, description: string, searchHistoryId: string) {
  return { Name: name, Description: description, SearchHistoryID: searchHistoryId };
}

export function buildSavedSearchQuery(keywords = "", skip = 0, limit = 100) {
  return { Keywords: keywords, Skip: skip, Limit: limit, Sort: "Created_Desc" };
}

export function buildTrackComment(trackId: string, text: string) {
  return { TrackID: trackId, TagName: text };
}

export function buildPlaylistSuggestions(limit = 12) {
  return { Skip: 0, Limit: Math.min(100, limit), MainOnly: true, SeedDetermination: "Created_Desc", SeedLimit: 5, SeedMin: "" };
}

export interface PlaylistShareContractInput {
  fromMemberToken: string;
  toMemberToken: string;
  playlistId: string;
  shareType: "Sync" | "Copy";
  allowDownload: boolean;
  allowFollow: boolean;
  allowSave: boolean;
  allowShare: boolean;
}

export function buildPlaylistShare(input: PlaylistShareContractInput) {
  return {
    FromMemberToken: input.fromMemberToken,
    ToMemberToken: input.toMemberToken,
    ObjectIdentifier: input.playlistId,
    ObjectType: "Playlist",
    ShareType: input.shareType,
    AllowDownload: input.allowDownload,
    AllowFollow: input.allowFollow,
    AllowSave: input.allowSave,
    AllowShare: input.allowShare,
  };
}
