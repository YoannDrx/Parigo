import "server-only";

import type { MemberSavedSearch, MemberTag, MemberTrackComment, Playlist, Track } from "@/types";
import { assetUrl, getAssetTemplates } from "./assets";
import { findHarvestToken, getRegionId, guestRequest, memberRequest, serviceRequest } from "./client";
import { mapPlaylist, mapTrack } from "./catalog";
import { HarvestError, isRecord } from "./errors";
import { asBoolean, asIsoDate, asNumber, asString, recordArray } from "./values";
import { HarvestMemberTagSchema } from "./contracts";
import {
  buildAddTracksToPlaylists,
  buildAddTracksToTags,
  buildCopyFeaturedPlaylist,
  buildDownloadRequest,
  buildDownloadValidation,
  buildMemberPlaylist,
  buildPlaylistShare,
  buildPlaylistSuggestions,
  buildReorderPlaylistTracks,
  buildSavedSearch,
  buildSavedSearchQuery,
  buildTrackComment,
} from "./member-contracts";

type HarvestRecord = Record<string, unknown>;
const WRITE_VERIFICATION_DELAYS_MS = [0, 250, 1_000, 3_000] as const;

async function pollForMemberPlaylist(
  memberToken: string,
  predicate: (playlist: Playlist) => boolean,
): Promise<Playlist | null> {
  for (const delay of WRITE_VERIFICATION_DELAYS_MS) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    const playlists = await getMemberPlaylists(memberToken, 0, 500);
    const playlist = playlists.find(predicate);
    if (playlist) return await getMemberPlaylist(memberToken, playlist.id) || playlist;
  }
  return null;
}

async function pollMemberPlaylistState(
  memberToken: string,
  playlistId: string,
  predicate: (playlist: Playlist | null) => boolean,
): Promise<Playlist | null> {
  let playlist: Playlist | null = null;
  for (const delay of WRITE_VERIFICATION_DELAYS_MS) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      playlist = await getMemberPlaylist(memberToken, playlistId);
    } catch (error) {
      if (error instanceof HarvestError && error.code === "NOT_FOUND") playlist = null;
      else throw error;
    }
    if (predicate(playlist)) return playlist;
  }
  throw new HarvestError(
    "Harvest acknowledged the playlist operation but the resulting state could not be verified",
    "HARVEST_INVALID_RESPONSE",
    502,
    false,
  );
}

async function pollMemberPlaylistAbsent(memberToken: string, playlistId: string): Promise<void> {
  for (const delay of WRITE_VERIFICATION_DELAYS_MS) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    const playlists = await getMemberPlaylists(memberToken, 0, 500);
    if (!playlists.some((playlist) => playlist.id === playlistId)) return;
  }
  throw new HarvestError(
    "Harvest acknowledged the playlist deletion but the playlist is still present",
    "HARVEST_INVALID_RESPONSE",
    502,
    false,
  );
}

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
  input: { title: string; description?: string },
): Promise<Playlist> {
  const beforeIds = new Set(
    (await getMemberPlaylists(memberToken, 0, 500)).map((playlist) => playlist.id),
  );
  const payload = await memberRequest<HarvestRecord>(memberToken, (token) => `/addmemberplaylist/${token}`, {
    method: "POST",
    body: JSON.stringify(buildMemberPlaylist(input.title, input.description || "")),
  });
  const responseId = asString(recordArray(payload, "Playlists")[0]?.ID);
  const created = await pollForMemberPlaylist(
    memberToken,
    (playlist) =>
      (responseId ? playlist.id === responseId : !beforeIds.has(playlist.id)) &&
      playlist.title === input.title,
  );
  if (!created) {
    throw new HarvestError(
      "Harvest did not create or return the requested member playlist",
      "HARVEST_INVALID_RESPONSE",
      502,
      false,
    );
  }
  return created;
}

export async function removeMemberPlaylist(memberToken: string, id: string): Promise<void> {
  let operationError: unknown;
  try {
    await memberRequest(memberToken, (token) => `/removeplaylist/${token}/${encodeURIComponent(id)}`);
  } catch (error) {
    operationError = error;
  }
  try {
    await pollMemberPlaylistAbsent(memberToken, id);
  } catch (verificationError) {
    throw operationError || verificationError;
  }
}

export async function updateMemberPlaylist(memberToken: string, id: string, input: { title: string; description?: string }): Promise<Playlist> {
  await memberRequest(memberToken, (token) => `/updateplaylist/${token}/${encodeURIComponent(id)}`, {
    method: "POST",
    body: JSON.stringify(buildMemberPlaylist(input.title, input.description || "")),
  });
  const expectedDescription = input.description || "";
  const playlist = await pollMemberPlaylistState(
    memberToken,
    id,
    (candidate) =>
      candidate?.title === input.title &&
      (candidate.description || "") === expectedDescription,
  );
  if (!playlist) {
    throw new HarvestError("Harvest removed the playlist during update", "HARVEST_INVALID_RESPONSE");
  }
  return playlist;
}

export async function copyFeaturedPlaylist(memberToken: string, playlistId: string): Promise<Playlist> {
  const beforeIds = new Set(
    (await getMemberPlaylists(memberToken, 0, 500)).map((playlist) => playlist.id),
  );
  const payload = await memberRequest<HarvestRecord>(memberToken, (token) => `/copytomemberplaylist/${token}`, {
    method: "POST",
    body: JSON.stringify(buildCopyFeaturedPlaylist(playlistId)),
  });
  const responseId = asString(recordArray(payload, "Playlists")[0]?.ID);
  const copied = await pollForMemberPlaylist(
    memberToken,
    (playlist) => responseId ? playlist.id === responseId : !beforeIds.has(playlist.id),
  );
  if (!copied) {
    throw new HarvestError(
      "Harvest did not create or return the copied member playlist",
      "HARVEST_INVALID_RESPONSE",
      502,
      false,
    );
  }
  return copied;
}

export async function addTracksToPlaylist(memberToken: string, playlistId: string, trackIds: string[]): Promise<void> {
  await memberRequest(memberToken, (token) => `/addtomemberplaylists/${token}`, {
    method: "POST",
    body: JSON.stringify(buildAddTracksToPlaylists([playlistId], trackIds)),
  });
}

export async function removeTracksFromPlaylist(memberToken: string, playlistId: string, trackIds: string[]): Promise<void> {
  await memberRequest(memberToken, (token) => `/removeplaylisttracks/${token}/${encodeURIComponent(playlistId)}`, {
    method: "POST",
    body: JSON.stringify({ TrackIDs: trackIds, Tracks: trackIds.map((ID) => ({ ID })) }),
  });
}

export async function reorderPlaylistTracks(memberToken: string, playlistId: string, trackIds: string[]): Promise<void> {
  const playlist = await getMemberPlaylist(memberToken, playlistId);
  if (!playlist) throw new HarvestError("Member playlist not found", "NOT_FOUND", 404);
  const currentIds = playlist.tracks?.map((track) => track.id) || [];
  if (
    currentIds.length !== trackIds.length ||
    currentIds.some((trackId) => !trackIds.includes(trackId)) ||
    new Set(trackIds).size !== trackIds.length
  ) {
    throw new HarvestError(
      "The requested order must contain every playlist track exactly once",
      "VALIDATION_FAILED",
      400,
    );
  }

  const workingOrder = [...currentIds];
  for (let index = 0; index < trackIds.length; index += 1) {
    const desiredTrackId = trackIds[index];
    if (workingOrder[index] === desiredTrackId) continue;
    const succeedingTrackId = workingOrder[index];
    await memberRequest(memberToken, (token) => `/reordermemberplaylisttracks/${token}`, {
      method: "POST",
      body: JSON.stringify(buildReorderPlaylistTracks(
        playlistId,
        [desiredTrackId],
        { succeedingTrackId },
      )),
    });
    const previousIndex = workingOrder.indexOf(desiredTrackId);
    workingOrder.splice(previousIndex, 1);
    workingOrder.splice(index, 0, desiredTrackId);
  }
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

function mapSavedSearch(item: HarvestRecord, utcOffsetHours?: number): MemberSavedSearch {
  const description = asString(item.Description);
  return {
    id: asString(item.ID),
    name: asString(item.Name, "Recherche sans titre"),
    description: description && !description.startsWith(SEARCH_URL_PREFIX) ? description : undefined,
    searchUrl: description.startsWith(SEARCH_URL_PREFIX) ? description.slice(SEARCH_URL_PREFIX.length) : undefined,
    searchTermsCount: asNumber(item.SearchTermsCount),
    createdAt: asIsoDate(item.CreatedDate, utcOffsetHours),
    updatedAt: asIsoDate(item.LastUpdateDate, utcOffsetHours),
  };
}

export async function getMemberSavedSearches(
  memberToken: string,
  utcOffsetHours?: number,
): Promise<MemberSavedSearch[]> {
  const payload = await memberRequest<HarvestRecord>(memberToken, (token) => `/searchmembersavesearches/${token}`, {
    method: "POST",
    body: JSON.stringify(buildSavedSearchQuery()),
  });
  return recordArray(payload, "SavedSearches")
    .map((item) => mapSavedSearch(item, utcOffsetHours))
    .filter((item) => item.id);
}

export async function createMemberSavedSearch(
  memberToken: string,
  input: { name: string; searchHistoryId: string; searchUrl: string },
  utcOffsetHours?: number,
): Promise<MemberSavedSearch> {
  const payload = await memberRequest<HarvestRecord>(memberToken, (token) => `/addmembersavesearch/${token}`, {
    method: "POST",
    body: JSON.stringify(buildSavedSearch(input.name, `${SEARCH_URL_PREFIX}${input.searchUrl}`, input.searchHistoryId)),
  });
  const item = isRecord(payload) ? payload : recordArray(payload, "SavedSearches")[0];
  if (!item || !asString(item.ID)) throw new HarvestError("Parigo did not return the saved search", "HARVEST_INVALID_RESPONSE");
  return mapSavedSearch(item, utcOffsetHours);
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

export async function getAuditionHistory(
  memberToken: string,
  skip = 0,
  limit = 50,
  memberUtcOffsetHours?: number,
) {
  const end = new Date();
  const start = new Date(end);
  start.setUTCFullYear(start.getUTCFullYear() - 1);
  const [payload, templates] = await Promise.all([
    memberRequest<HarvestRecord>(
      memberToken,
      (token) =>
        `/gethistorybymembertoken/${token}?startdate=${start.toISOString().slice(0, 10)}&enddate=${end.toISOString().slice(0, 10)}&skip=${skip}&limit=${limit}`,
    ),
    getAssetTemplates(),
  ]);
  const history = isRecord(payload.History) ? payload.History : payload;
  const tracks = recordArray(history, "Tracks");
  const tracksById = new Map(
    tracks
      .map((track) => [asString(track.ID), track] as const)
      .filter(([trackId]) => trackId),
  );
  const items = recordArray(history, "HistoryItems").flatMap((item, index) => {
    const trackId = asString(item.TrackID);
    const track = tracksById.get(trackId);
    const utcOffsetHours = item.UTCOffset === undefined
      ? memberUtcOffsetHours
      : asNumber(item.UTCOffset, Number.NaN);
    const playedAt = asIsoDate(
      item.DeliveryDate,
      Number.isFinite(utcOffsetHours) ? utcOffsetHours : undefined,
    );
    if (!track || !playedAt) return [];
    return [{
      id: asString(item.ID) || `${trackId}-${asString(item.DeliveryDate, String(index))}-${index}`,
      playedAt,
      itemType: asString(item.ItemType || item.Type) || undefined,
      utcOffsetHours: Number.isFinite(utcOffsetHours) ? utcOffsetHours : undefined,
      track: mapTrack(track, templates, undefined, "history"),
    }];
  });
  return {
    items,
    total: asNumber(history.TotalHistoryItems, items.length),
  };
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
  input: { trackIds: string[]; formatId: string; email: string; includeVersions?: boolean },
) {
  const validationBody = buildDownloadValidation(
    input.trackIds,
    input.formatId,
    Boolean(input.includeVersions),
  );
  const validation = await memberRequest<HarvestRecord>(memberToken, (token) => `/validatemusicdownloadrequest/${token}`, {
    method: "POST",
    body: JSON.stringify(validationBody),
  });
  const validationContainer = isRecord(validation.ValidateMusicDownloads)
    ? validation.ValidateMusicDownloads
    : validation;
  const validations = recordArray(validationContainer, "ValidateMusicDownloadList");
  if (!validations.length) {
    throw new HarvestError(
      "Harvest did not return the documented download validation result",
      "HARVEST_INVALID_RESPONSE",
      502,
      false,
    );
  }
  const permitted = validations.some((item) =>
    asBoolean(item.DownloadAllowed) || asBoolean(item.DirectDownloadAllowed),
  );
  const validationBlocked = Array.isArray(validation.BlockedContentIDs)
    ? validation.BlockedContentIDs.map((item) => asString(item)).filter(Boolean)
    : [];
  if (!permitted) {
    throw new HarvestError("Download is not permitted for this content or format", "FORBIDDEN", 403);
  }
  const downloadBody = buildDownloadRequest(
    input.trackIds,
    input.formatId,
    input.email,
    Boolean(input.includeVersions),
  );
  const request = await memberRequest<HarvestRecord>(memberToken, (token) => `/getmusicdownload/${token}`, {
    method: "POST",
    body: JSON.stringify(downloadBody),
  });
  const downloadTokens = recordArray(request, "DownloadTokens")
    .map((item) => asString(item.TokenValue))
    .filter(Boolean);
  const templates = downloadTokens.length ? await getAssetTemplates() : null;
  if (downloadTokens.length && !templates?.directDownload) {
    throw new HarvestError(
      "Harvest did not return the documented direct download URL template",
      "HARVEST_INVALID_RESPONSE",
      502,
      false,
    );
  }
  return {
    requested: Boolean(request.RequestSent),
    downloadUrls: downloadTokens.map((downloadToken) =>
      assetUrl(templates!.directDownload, { downloadtoken: downloadToken })
    ),
    blockedContentIds: [...new Set([
      ...validationBlocked,
      ...(Array.isArray(request.BlockedContentIDs)
        ? request.BlockedContentIDs.map((item) => asString(item)).filter(Boolean)
        : []),
    ])],
  };
}

export async function getDownloadInfo(downloadToken: string) {
  const templates = await getAssetTemplates();
  if (!templates.directDownload) {
    throw new HarvestError(
      "Harvest did not return the documented direct download URL template",
      "HARVEST_INVALID_RESPONSE",
      502,
      false,
    );
  }
  return {
    files: [{
      name: "",
      url: assetUrl(templates.directDownload, { downloadtoken: downloadToken }),
      status: "Prepared",
      part: 1,
    }],
    total: 1,
  };
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
  if (isRecord(payload) && Array.isArray(payload.files)) {
    return {
      files: payload.files.filter(isRecord).map((item) => ({
        name: asString(item.name),
        url: asString(item.url),
        status: asString(item.status),
        part: asNumber(item.part),
      })),
      total: asNumber(payload.total),
    };
  }
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
