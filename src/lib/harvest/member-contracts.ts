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

export function buildMemberVerificationEmail(email: string) {
  return { Email: email, ExternalVerifyToken: "" };
}

export function buildPasswordUpdate(token: string, password: string) {
  return { Token: token, Password: password };
}

export function buildMemberRemoval(password: string, archiveOnly: boolean) {
  return { Password: password, ArchiveOnly: archiveOnly };
}

export function buildAddTracksToTags(tagIds: string[], trackIds: string[]) {
  return { ObjectType: "Track", ObjectIDs: trackIds, AddToTagIDs: tagIds };
}

export function buildCreateMemberPlaylist(title: string, description = "") {
  return {
    requestaddupdateplaylist: {
      playlistname: title,
      playlistdescription: description,
      playlisttags: "",
      highlighttracks: false,
      autosave: false,
      autosavelimit: 0,
      autosaveapplytohighlighttracks: false,
      playlistcategoryid: "",
      externalplaylistimageurl: "",
      orderby: "",
    },
  };
}

export function buildUpdateMemberPlaylist(title: string, description = "") {
  return {
    playlistname: title,
    playlistdescription: description,
    playlisttags: "",
    highlighttracks: false,
    autosave: false,
    autosavelimit: 0,
    autosaveapplytohighlighttracks: false,
    playlistcategoryid: "",
    externalplaylistimageurl: "",
    orderby: "",
  };
}

export function buildCopyFeaturedPlaylist(playlistId: string, playlistName?: string) {
  return {
    PlaylistID: playlistId,
    ...(playlistName ? { PlaylistName: playlistName } : {}),
    CopyTracks: true,
  };
}

export function buildAddTracksToPlaylists(playlistIds: string[], trackIds: string[]) {
  return {
    ObjectType: "Track",
    ObjectIDs: trackIds,
    AddToPlaylistIDs: playlistIds,
    ObjectTrimStart: null,
    ObjectTrimEnd: null,
    AddToAutoSavePlaylists: false,
  };
}

export function buildRemovePlaylistTracks(trackIds: string[]) {
  return {
    track: trackIds.map((id) => ({ id })),
  };
}

export function buildCueSheetTracks(trackIds: string[]) {
  return {
    track: trackIds,
  };
}

export function buildReorderPlaylistTracks(
  playlistId: string,
  trackIds: string[],
  position: { precedingTrackId?: string; succeedingTrackId?: string; orderId?: number },
) {
  const positions = [
    position.precedingTrackId !== undefined,
    position.succeedingTrackId !== undefined,
    position.orderId !== undefined,
  ].filter(Boolean);
  if (positions.length !== 1) {
    throw new TypeError("Exactly one Harvest playlist position must be provided");
  }
  return {
    FromPlaylistID: playlistId,
    ToPlaylistID: playlistId,
    // Harvest's executable JSON example serializes this field as a string,
    // even though the endpoint can move multiple tracks.
    TrackIDs: trackIds.join(","),
    ...(position.precedingTrackId !== undefined ? { PrecedingTrackID: position.precedingTrackId } : {}),
    ...(position.succeedingTrackId !== undefined ? { SucceedingTrackID: position.succeedingTrackId } : {}),
    ...(position.orderId !== undefined ? { OrderID: position.orderId } : {}),
    Copy: false,
  };
}

export function buildDownloadValidation(
  trackIds: string[],
  formatId: string,
  includeVersions = false,
) {
  return {
    Identifier: trackIds.join(","),
    ContentIDs: "",
    DownloadType: "track",
    Format: [formatId],
    TrimEndSecs: 0,
    TrimStartSecs: 0,
    IncludeVersionCheck: includeVersions,
  };
}

export function buildDownloadRequest(
  trackIds: string[],
  formatId: string,
  email: string,
  includeVersions = false,
) {
  return {
    Identifier: trackIds.join(","),
    DownloadType: "track",
    Format: formatId,
    TrimStartSecs: 0,
    TrimEndSecs: 0,
    Email: email,
    IsShare: false,
    Message: "",
    SenderEmail: email,
    ForceEmail: false,
    IncludeVersions: includeVersions,
    VersionFolderName: "",
    DownloadFileName: "",
    CuesheetFileName: "",
    IncludeCuesheetFile: true,
  };
}

export function buildSavedSearch(name: string, description: string, searchHistoryId: string) {
  return { Name: name, Description: description, SearchHistoryID: searchHistoryId };
}

export function buildUpdateSavedSearch(
  id: string,
  name: string,
  description = "",
  searchHistoryId = "",
) {
  return { ID: id, Name: name, Description: description, SearchHistoryID: searchHistoryId };
}

export function buildSavedSearchQuery(keywords = "", skip = 0, limit = 100) {
  return { Keywords: keywords, Skip: skip, Limit: limit, Sort: "Created_Desc" };
}

export function buildPlaylistCategory(
  name: string,
  description = "",
  colorHex = "",
  addToTop = false,
) {
  return {
    PlaylistCategoryName: name,
    PlaylistCategoryDescription: description,
    ColorHex: colorHex,
    AddToTop: addToTop,
  };
}

export function buildUpdatePlaylistCategory(
  name: string,
  description = "",
  colorHex = "",
) {
  return {
    PlaylistCategoryName: name,
    PlaylistCategoryDescription: description,
    ColorHex: colorHex,
  };
}

export function buildDuplicateMemberPlaylist(sourcePlaylistId: string, name?: string) {
  return {
    SourcePlaylistID: sourcePlaylistId,
    ...(name ? { DuplicatePlaylistName: name } : {}),
  };
}

export function buildSearchMemberPlaylistTracks(
  keyword: string,
  input: {
    fields?: string[];
    skip?: number;
    limit?: number;
    orderBy?: string;
    returnTrackCount?: boolean;
  } = {},
) {
  return {
    Keyword: keyword,
    Fields: (input.fields ?? ["TrackDisplayTitle", "TrackDescription"]).join(","),
    ReturnTrackCount: input.returnTrackCount ?? true,
    Skip: input.skip ?? 0,
    Limit: input.limit ?? 50,
    OrderBy: input.orderBy ?? "Custom_ASC",
  };
}

export function buildDownloadInfoQuery(
  identifier: { downloadId: string } | { downloadGroupId: string },
  skip = 0,
  limit = 100,
) {
  return {
    Skip: skip,
    Limit: limit,
    ...("downloadId" in identifier
      ? { DownloadID: identifier.downloadId }
      : { DownloadGroupID: identifier.downloadGroupId }),
  };
}

export function buildCommunicationHistory(
  input: { skip?: number; limit?: number; startDate?: string; endDate?: string } = {},
) {
  return {
    Skip: input.skip ?? 0,
    Limit: input.limit ?? 50,
    Sort: "Created_Desc",
    StartDate: input.startDate ?? "",
    EndDate: input.endDate ?? "",
  };
}

export function buildCreateTrackComment(trackId: string, text: string) {
  return { trackid: trackId, TagName: text };
}

export function buildUpdateTrackComment(commentId: string, text: string) {
  return { TagID: commentId, TagName: text };
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
