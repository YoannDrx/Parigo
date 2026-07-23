import "server-only";

import type { MemberSavedSearch, MemberTag, MemberTrackComment, Playlist, Track } from "@/types";
import { getAssetTemplates } from "./assets";
import { findHarvestToken, getRegionId, guestRequest, memberRequest, serviceRequest } from "./client";
import { mapPlaylist, mapTrack } from "./catalog";
import { HarvestError, isRecord } from "./errors";
import { asBoolean, asIsoDate, asNumber, asString, recordArray } from "./values";
import { HarvestMemberTagSchema } from "./contracts";
import { buildAddTracksToTags, buildPlaylistShare, buildPlaylistSuggestions, buildSavedSearch, buildSavedSearchQuery, buildTrackComment } from "./member-contracts";

type HarvestRecord = Record<string, unknown>;

export async function getFavouriteTracks(memberToken: string, skip = 0, limit = 500): Promise<Track[]> {
  const [payload, templates] = await Promise.all([
    memberRequest<HarvestRecord>(
      memberToken,
      (token) => `/getfavourites/${token}?Skip=${skip}&Limit=${limit}&Sort=Created_Desc`,
    ),
    getAssetTemplates(),
  ]);
  const favourites = isRecord(payload.Favourites) ? payload.Favourites : payload;
  return recordArray(favourites, "Tracks").map((item) => mapTrack(item, templates, undefined, "favourites"));
}

export async function addFavourite(memberToken: string, type: "Track" | "Album", id: string): Promise<void> {
  await memberRequest(memberToken, (token) => `/addtofavourites/${token}/${type}/${encodeURIComponent(id)}`);
}

export async function removeFavouriteTrack(memberToken: string, trackId: string): Promise<void> {
  await memberRequest(memberToken, (token) => `/removefavouritestrack/${token}/${encodeURIComponent(trackId)}`);
}

export async function getMemberPlaylists(memberToken: string, skip = 0, limit = 100): Promise<Playlist[]> {
  const [payload, templates] = await Promise.all([
    memberRequest<HarvestRecord>(
      memberToken,
      (token) => `/getmemberplaylistsnotracks/${token}?Skip=${skip}&Limit=${limit}`,
    ),
    getAssetTemplates(),
  ]);
  return recordArray(payload, "Playlists").map((item) => ({
    ...mapPlaylist(item, templates),
    isFeatured: false,
  }));
}

export async function getMemberPlaylist(memberToken: string, playlistId: string): Promise<Playlist | null> {
  const [payload, templates] = await Promise.all([
    memberRequest<HarvestRecord>(memberToken, (token) => `/getmemberplaylist/${token}/${encodeURIComponent(playlistId)}?returntracks=true&returnpublishlocations=false`),
    getAssetTemplates(),
  ]);
  const item = recordArray(payload, "Playlists")[0];
  if (!item) return null;
  return { ...mapPlaylist(item, templates), isFeatured: false, tracks: recordArray(item, "Tracks").map((track) => mapTrack(track, templates, undefined, "member-playlist")) };
}

export async function createMemberPlaylist(
  memberToken: string,
  input: { title: string; description?: string; isPublic?: boolean },
): Promise<Playlist | null> {
  const [payload, templates] = await Promise.all([
    memberRequest<HarvestRecord>(memberToken, (token) => `/addmemberplaylist/${token}`, {
      method: "POST",
      body: JSON.stringify({
        Name: input.title,
        Description: input.description || "",
        IsPublic: Boolean(input.isPublic),
        PlaylistCategoryID: "",
      }),
    }),
    getAssetTemplates(),
  ]);
  const playlist = recordArray(payload, "Playlists")[0];
  return playlist ? { ...mapPlaylist(playlist, templates), isFeatured: false } : null;
}

export async function removeMemberPlaylist(memberToken: string, id: string): Promise<void> {
  await memberRequest(memberToken, (token) => `/removeplaylist/${token}/${encodeURIComponent(id)}`);
}

export async function updateMemberPlaylist(memberToken: string, id: string, input: { title: string; description?: string }): Promise<void> {
  await memberRequest(memberToken, (token) => `/updateplaylist/${token}/${encodeURIComponent(id)}`, {
    method: "POST",
    body: JSON.stringify({ Name: input.title, Description: input.description || "" }),
  });
}

export async function copyFeaturedPlaylist(memberToken: string, playlistId: string): Promise<void> {
  await memberRequest(memberToken, (token) => `/copytomemberplaylist/${token}`, {
    method: "POST",
    body: JSON.stringify({ PlaylistID: playlistId, FeaturedPlaylistID: playlistId }),
  });
}

export async function addTracksToPlaylist(memberToken: string, playlistId: string, trackIds: string[]): Promise<void> {
  await memberRequest(memberToken, (token) => `/addtomemberplaylists/${token}`, {
    method: "POST",
    body: JSON.stringify({
      Playlists: [{ PlaylistID: playlistId, TrackIDs: trackIds }],
      PlaylistIDs: [playlistId],
      TrackIDs: trackIds,
    }),
  });
}

export async function removeTracksFromPlaylist(memberToken: string, playlistId: string, trackIds: string[]): Promise<void> {
  await memberRequest(memberToken, (token) => `/removeplaylisttracks/${token}/${encodeURIComponent(playlistId)}`, {
    method: "POST",
    body: JSON.stringify({ TrackIDs: trackIds, Tracks: trackIds.map((ID) => ({ ID })) }),
  });
}

export async function reorderPlaylistTracks(memberToken: string, playlistId: string, trackIds: string[]): Promise<void> {
  await memberRequest(memberToken, (token) => `/reordermemberplaylisttracks/${token}`, {
    method: "POST",
    body: JSON.stringify({ PlaylistID: playlistId, TrackIDs: trackIds, Tracks: trackIds.map((ID, index) => ({ ID, OrderID: index + 1 })) }),
  });
}

export async function suggestPlaylistTracks(memberToken: string, playlistId: string, limit = 12): Promise<Track[]> {
  const [payload, templates] = await Promise.all([
    memberRequest<HarvestRecord>(memberToken, (token) => `/suggestmemberplaylisttracks/${token}/${encodeURIComponent(playlistId)}`, {
      method: "POST",
      body: JSON.stringify(buildPlaylistSuggestions(limit)),
    }, 15_000),
    getAssetTemplates(),
  ]);
  return recordArray(payload, "Tracks").map((track) => mapTrack(track, templates, undefined, "member-playlist-suggestion"));
}

export async function createPlaylistShare(memberToken: string, input: {
  playlistId: string;
  playlistTitle: string;
  fromEmail: string;
  toEmail: string;
  message?: string;
  shareType: "Sync" | "Copy";
  allowDownload: boolean;
  allowFollow: boolean;
  allowSave: boolean;
  allowShare: boolean;
  sendEmail: boolean;
}) {
  const regionId = await getRegionId();
  const invited = await serviceRequest<HarvestRecord>((token) => `/getinvitedmembertoken/${token}`, {
    method: "POST",
    body: JSON.stringify({ Email: input.toEmail, RegionID: regionId }),
  });
  const recipientToken = findHarvestToken(invited);
  if (!recipientToken) throw new HarvestError("Parigo did not return a recipient token", "HARVEST_INVALID_RESPONSE");
  const share = await serviceRequest<HarvestRecord>((token) => `/getsharemusicurl/${token}`, {
    method: "POST",
    body: JSON.stringify(buildPlaylistShare({
      fromMemberToken: memberToken,
      toMemberToken: recipientToken,
      playlistId: input.playlistId,
      shareType: input.shareType,
      allowDownload: input.allowDownload,
      allowFollow: input.allowFollow,
      allowSave: input.allowSave,
      allowShare: input.allowShare,
    })),
  });
  const url = asString(share.Url || share.URL);
  if (!url) throw new HarvestError("Parigo did not return a playlist share URL", "HARVEST_INVALID_RESPONSE");
  if (input.sendEmail) {
    await memberRequest(memberToken, (token) => `/sendsharemusiclinkemail/${token}`, {
      method: "POST",
      body: JSON.stringify({
        FromEmail: input.fromEmail,
        ToEmail: input.toEmail,
        Message: input.message || "",
        Link: url,
        ContentType: "Playlist",
        ContentTitle: input.playlistTitle,
        SelectEmailTemplateByMemberRegion: true,
      }),
    });
  }
  return { url, emailed: input.sendEmail, status: asString(share.Status, "success") };
}

const SEARCH_URL_PREFIX = "PARIGO_URL:";

function mapSavedSearch(item: HarvestRecord): MemberSavedSearch {
  const description = asString(item.Description);
  return {
    id: asString(item.ID),
    name: asString(item.Name, "Recherche sans titre"),
    description: description && !description.startsWith(SEARCH_URL_PREFIX) ? description : undefined,
    searchUrl: description.startsWith(SEARCH_URL_PREFIX) ? description.slice(SEARCH_URL_PREFIX.length) : undefined,
    searchTermsCount: asNumber(item.SearchTermsCount),
    createdAt: asIsoDate(item.CreatedDate),
    updatedAt: asIsoDate(item.LastUpdateDate),
  };
}

export async function getMemberSavedSearches(memberToken: string): Promise<MemberSavedSearch[]> {
  const payload = await memberRequest<HarvestRecord>(memberToken, (token) => `/searchmembersavesearches/${token}`, {
    method: "POST",
    body: JSON.stringify(buildSavedSearchQuery()),
  });
  return recordArray(payload, "SavedSearches").map(mapSavedSearch).filter((item) => item.id);
}

export async function createMemberSavedSearch(memberToken: string, input: { name: string; searchHistoryId: string; searchUrl: string }): Promise<MemberSavedSearch> {
  const payload = await memberRequest<HarvestRecord>(memberToken, (token) => `/addmembersavesearch/${token}`, {
    method: "POST",
    body: JSON.stringify(buildSavedSearch(input.name, `${SEARCH_URL_PREFIX}${input.searchUrl}`, input.searchHistoryId)),
  });
  const item = isRecord(payload) ? payload : recordArray(payload, "SavedSearches")[0];
  if (!item || !asString(item.ID)) throw new HarvestError("Parigo did not return the saved search", "HARVEST_INVALID_RESPONSE");
  return mapSavedSearch(item);
}

export async function removeMemberSavedSearch(memberToken: string, searchId: string): Promise<void> {
  await memberRequest(memberToken, (token) => `/removemembersavedsearch/${token}/${encodeURIComponent(searchId)}`);
}

function mapTrackComment(item: HarvestRecord, trackId: string): MemberTrackComment {
  return {
    id: asString(item.tagid || item.TagID || item.ID),
    trackId,
    text: asString(item.tagname || item.TagName || item.Name),
    createdAt: asIsoDate(item.CreateDate || item.CreatedDate),
    updatedAt: asIsoDate(item.LastUpdateDate || item.LastUpdated),
    isAdmin: Boolean(asString(item.managementuserid || item.ManagementUserID)),
  };
}

export async function getTrackComments(memberToken: string, trackId: string): Promise<MemberTrackComment[]> {
  const payload = await memberRequest<HarvestRecord>(memberToken, (token) => `/gettrackmembercomments/${token}/${encodeURIComponent(trackId)}?includeadmin=false`);
  return recordArray(payload, "Tags").map((item) => mapTrackComment(item, trackId)).filter((item) => item.id && item.text);
}

export async function createTrackComment(memberToken: string, trackId: string, text: string): Promise<MemberTrackComment> {
  const payload = await memberRequest<HarvestRecord>(memberToken, (token) => `/addtrackmembercomment/${token}`, {
    method: "POST",
    body: JSON.stringify(buildTrackComment(trackId, text)),
  });
  const item = recordArray(payload, "Tags")[0];
  if (!item) throw new HarvestError("Parigo did not return the private note", "HARVEST_INVALID_RESPONSE");
  return mapTrackComment(item, trackId);
}

export async function updateTrackComment(memberToken: string, commentId: string, trackId: string, text: string): Promise<MemberTrackComment> {
  const payload = await memberRequest<HarvestRecord>(memberToken, (token) => `/updatetrackmembercomment/${token}`, {
    method: "POST",
    body: JSON.stringify(buildTrackComment(commentId, text)),
  });
  const item = recordArray(payload, "Tags")[0];
  if (!item) throw new HarvestError("Parigo did not return the updated private note", "HARVEST_INVALID_RESPONSE");
  return mapTrackComment(item, trackId);
}

export async function removeTrackComment(memberToken: string, commentId: string): Promise<void> {
  await memberRequest(memberToken, (token) => `/removetrackmembercomment/${token}/${encodeURIComponent(commentId)}`);
}

function mapMemberTag(value: unknown): MemberTag {
  const tag = HarvestMemberTagSchema.parse(value);
  return {
    id: tag.TagID,
    name: tag.TagName,
    trackCount: tag.TrackCount ?? tag.Tracks?.length ?? 0,
    createdAt: tag.CreateDate ? asIsoDate(tag.CreateDate) : undefined,
  };
}

export async function getMemberTags(memberToken: string, skip = 0, limit = 100): Promise<MemberTag[]> {
  const payload = await memberRequest<HarvestRecord>(memberToken, (token) => `/getmembertags/${token}?Skip=${skip}&Limit=${limit}&Sort=Alphabetic_Asc&ReturnTagCount=1`);
  return recordArray(payload, "Tags").map(mapMemberTag);
}

export async function createMemberTag(memberToken: string, name: string): Promise<MemberTag> {
  const payload = await memberRequest<HarvestRecord>(memberToken, (token) => `/addmembertag/${token}`, {
    method: "POST",
    body: JSON.stringify({ TagName: name }),
  });
  const tag = recordArray(payload, "Tags")[0];
  if (!tag) throw new HarvestError("Harvest did not return the created tag", "HARVEST_INVALID_RESPONSE");
  return mapMemberTag(tag);
}

export async function updateMemberTag(memberToken: string, tagId: string, name: string): Promise<MemberTag | null> {
  const payload = await memberRequest<HarvestRecord>(memberToken, (token) => `/updatemembertag/${token}/${encodeURIComponent(tagId)}`, {
    method: "POST",
    body: JSON.stringify({ TagName: name }),
  });
  const tag = recordArray(payload, "Tags")[0];
  return tag ? mapMemberTag(tag) : null;
}

export async function addTracksToMemberTags(memberToken: string, tagIds: string[], trackIds: string[]): Promise<void> {
  await memberRequest(memberToken, (token) => `/addtomembertags/${token}`, {
    method: "POST",
    body: JSON.stringify(buildAddTracksToTags(tagIds, trackIds)),
  });
}

export async function getMemberTagTracks(memberToken: string, tagId: string, skip = 0, limit = 100): Promise<Track[]> {
  const [payload, templates] = await Promise.all([
    memberRequest<HarvestRecord>(memberToken, (token) => `/getmembertagtracks/${token}/${encodeURIComponent(tagId)}?Skip=${skip}&Limit=${limit}&Sort=Alphabetic_Asc`),
    getAssetTemplates(),
  ]);
  const tag = recordArray(payload, "Tags")[0];
  return tag ? recordArray(tag, "Tracks").map((track) => mapTrack(track, templates, undefined, "member-tag")) : [];
}

export async function removeTrackFromMemberTag(memberToken: string, tagId: string, trackId: string): Promise<void> {
  await memberRequest(memberToken, (token) => `/removetrackmembertag/${token}/${encodeURIComponent(tagId)}/${encodeURIComponent(trackId)}`);
}

export async function removeMemberTag(memberToken: string, tagId: string): Promise<void> {
  await memberRequest(memberToken, (token) => `/removemembertag/${token}/${encodeURIComponent(tagId)}`);
}

export async function getAuditionHistory(memberToken: string, skip = 0, limit = 50) {
  const end = new Date();
  const start = new Date(end);
  start.setUTCFullYear(start.getUTCFullYear() - 1);
  const [payload, templates] = await Promise.all([
    memberRequest<HarvestRecord>(
      memberToken,
      (token) =>
        `/gethistorybymembertoken/${token}?startdate=${encodeURIComponent(start.toISOString())}&enddate=${encodeURIComponent(end.toISOString())}&skip=${skip}&limit=${limit}`,
    ),
    getAssetTemplates(),
  ]);
  const history = isRecord(payload.History) ? payload.History : payload;
  const tracks = recordArray(history, "Tracks");
  return tracks.map((item, index) => ({
    id: `${asString(item.ID)}-${asString(item.DatePlayed, String(index))}`,
    playedAt: asIsoDate(item.DatePlayed || item.CreatedDate || item.LastUpdated) || new Date().toISOString(),
    track: mapTrack(item, templates, undefined, "history"),
  }));
}

export async function getDownloadHistory(memberToken: string, skip = 0, limit = 50) {
  const end = new Date();
  const start = new Date(end);
  start.setUTCFullYear(start.getUTCFullYear() - 2);
  const [payload, templates] = await Promise.all([
    memberRequest<HarvestRecord>(
      memberToken,
      (token) =>
        `/getdownloadhistorybymembertoken/${token}?startdate=${encodeURIComponent(start.toISOString())}&enddate=${encodeURIComponent(end.toISOString())}&skip=${skip}&limit=${limit}`,
    ),
    getAssetTemplates(),
  ]);
  const history = isRecord(payload.History) ? payload.History : payload;
  return recordArray(history, "Tracks").map((item, index) => ({
    id: `${asString(item.ID)}-${asString(item.DownloadedDate, String(index))}`,
    downloadedAt: asIsoDate(item.DownloadedDate || item.CreatedDate || item.LastUpdated) || new Date().toISOString(),
    licenseType: "HARVEST",
    projectName: "",
    track: mapTrack(item, templates, undefined, "download-history"),
  }));
}

export async function requestDownload(
  memberToken: string,
  input: { trackIds: string[]; formatId: string; includeVersions?: boolean },
) {
  const body = {
    Tracks: input.trackIds.map((ID) => ({ ID })),
    TrackIDs: input.trackIds,
    Format: input.formatId,
    FileFormatID: input.formatId,
    IncludeVersions: Boolean(input.includeVersions),
  };
  const validation = await memberRequest<HarvestRecord>(memberToken, (token) => `/validatemusicdownloadrequest/${token}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const validations = recordArray(validation, "ValidateMusicDownloadList");
  const permitted = validations.length === 0 || validations.some((item) =>
    asBoolean(item.DownloadAllowed) || asBoolean(item.DirectDownloadAllowed),
  );
  const validationBlocked = Array.isArray(validation.BlockedContentIDs)
    ? validation.BlockedContentIDs.map((item) => asString(item)).filter(Boolean)
    : [];
  if (!permitted) {
    throw new HarvestError("Download is not permitted for this content or format", "FORBIDDEN", 403);
  }
  const request = await memberRequest<HarvestRecord>(memberToken, (token) => `/getmusicdownload/${token}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return {
    requested: Boolean(request.RequestSent),
    tokens: recordArray(request, "DownloadTokens").map((item) => asString(item.TokenValue)).filter(Boolean),
    blockedContentIds: [...new Set([
      ...validationBlocked,
      ...(Array.isArray(request.BlockedContentIDs)
        ? request.BlockedContentIDs.map((item) => asString(item)).filter(Boolean)
        : []),
    ])],
  };
}

export async function getDownloadInfo(downloadToken: string) {
  return serviceRequest<HarvestRecord>((token) => `/getmusicdownloadinfo/${token}`, {
    method: "POST",
    body: JSON.stringify({ Token: downloadToken, DownloadToken: downloadToken }),
  });
}

export async function getSharedMusic(accessToken: string) {
  const [payload, templates] = await Promise.all([
    guestRequest<HarvestRecord>((token) => `/getsharemusic/${token}/${encodeURIComponent(accessToken)}`),
    getAssetTemplates(),
  ]);
  const referred = isRecord(payload.ReferredPlaylistObject) ? payload.ReferredPlaylistObject : payload;
  return recordArray(referred, "Playlists").map((item) => ({
    ...mapPlaylist(item, templates),
    tracks: recordArray(item, "Tracks").map((track) => mapTrack(track, templates, undefined, "shared-playlist")),
  }));
}

export async function createCueSheet(memberToken: string, filename: string, trackIds: string[]): Promise<string> {
  const payload = await memberRequest<HarvestRecord>(
    memberToken,
    (token) => `/getcuesheet/${token}?filename=${encodeURIComponent(filename)}`,
    { method: "POST", body: JSON.stringify({ TrackIDs: trackIds, Tracks: trackIds.map((ID) => ({ ID })) }) },
  );
  const url = asString(payload.FullUrl);
  if (!url) throw new HarvestError("Harvest did not return a cue sheet URL", "HARVEST_INVALID_RESPONSE");
  return url;
}

export function mapDownloadInfo(payload: unknown) {
  return {
    files: recordArray(payload, "Downloads").map((item) => ({
      name: asString(item.Name),
      url: asString(item.URL),
      status: asString(item.Status),
      part: asNumber(item.Part),
    })).filter((item) => item.name || item.url),
    total: isRecord(payload) ? asNumber(payload.TotalDownloads) : 0,
  };
}

export function historyTrackResponse(track: Track) {
  return track;
}

export function totalFromMemberPayload(payload: unknown, fallback: number): number {
  return isRecord(payload) ? asNumber(payload.Total, fallback) : fallback;
}
