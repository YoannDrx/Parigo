import "server-only";

import type {
  MemberCommunication,
  MemberPlaylistCategory,
  MemberSavedSearch,
  MemberTag,
  MemberTrackComment,
  MemberTrackCommentGroup,
  Playlist,
  RightHolder,
  Track,
} from "@/types";
import { assetUrl, getAssetTemplates, type HarvestAssetTemplates } from "./assets";
import { findHarvestToken, getRegionId, guestRequest, memberRequest, serviceRequest } from "./client";
import { mapPlaylist, mapRightHolder, mapTrack } from "./catalog";
import { HarvestError, isRecord } from "./errors";
import { asBoolean, asIsoDate, asNumber, asString, recordArray, recordItem } from "./values";
import { HarvestMemberTagSchema } from "./contracts";
import {
  buildAddTracksToPlaylists,
  buildCreateMemberPlaylist,
  buildCueSheetTracks,
  buildAddTracksToTags,
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
  buildUpdateSavedSearch,
  buildPlaylistCategory,
  buildUpdatePlaylistCategory,
  buildDuplicateMemberPlaylist,
  buildSearchMemberPlaylistTracks,
  buildDownloadInfoQuery,
  buildCommunicationHistory,
  buildCreateTrackComment,
  buildUpdateTrackComment,
} from "./member-contracts";
import {
  WRITE_VERIFICATION_OFFSETS_MS,
  waitForVerificationOffset,
} from "./write-verification";

type HarvestRecord = Record<string, unknown>;

const TRACK_COMMENT_INDEX_TAG_NAME = "PARIGO_INTERNAL_TRACK_COMMENTS_V1";

export function isReservedMemberTagName(name: string): boolean {
  return name.trim().toLocaleUpperCase() === TRACK_COMMENT_INDEX_TAG_NAME;
}

function containsHarvestId(value: unknown, expectedId: string): boolean {
  if (Array.isArray(value)) return value.some((item) => containsHarvestId(item, expectedId));
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, nested]) =>
    (key.toLowerCase() === "id" && asString(nested) === expectedId) ||
    containsHarvestId(nested, expectedId));
}

async function pollForMemberPlaylist(
  memberToken: string,
  predicate: (playlist: Playlist) => boolean,
): Promise<Playlist | null> {
  for (let index = 0; index < WRITE_VERIFICATION_OFFSETS_MS.length; index += 1) {
    await waitForVerificationOffset(index);
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
  for (let index = 0; index < WRITE_VERIFICATION_OFFSETS_MS.length; index += 1) {
    await waitForVerificationOffset(index);
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
  for (let index = 0; index < WRITE_VERIFICATION_OFFSETS_MS.length; index += 1) {
    await waitForVerificationOffset(index);
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
    getAssetTemplates(memberToken),
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
  const [flatPayload, hierarchyPayload, templates] = await Promise.all([
    memberRequest<HarvestRecord>(
      memberToken,
      (token) => `/getmemberplaylistsnotracks/${token}?Skip=${skip}&Limit=${limit}`,
    ),
    memberRequest<HarvestRecord>(
      memberToken,
      (token) => `/getmemberplaylistcategoriesandplaylists/${token}?returnplaylistcount=true&returntrackcount=true&returnrootobjectsonly=false&returnautosaveonly=false&returnfirstautosave=false&returnhighlightonly=false&playlistcategoryid=&skip=${skip}&limit=${limit}&sort=Custom_Asc`,
    ),
    getAssetTemplates(memberToken),
  ]);
  const byId = new Map<string, Playlist>();
  recordArray(flatPayload, "Playlists").forEach((item) => {
    const playlist = mapPlaylist(item, templates);
    byId.set(playlist.id, { ...playlist, isFeatured: false });
  });
  mapMemberPlaylistHierarchyResponse(hierarchyPayload, templates).forEach((playlist) => {
    byId.set(playlist.id, {
      ...byId.get(playlist.id),
      ...playlist,
      isFeatured: false,
    });
  });
  return [...byId.values()];
}

export function mapMemberPlaylistHierarchyResponse(
  payload: HarvestRecord,
  templates: HarvestAssetTemplates,
): Playlist[] {
  const playlists: Playlist[] = [];
  for (const object of recordArray(payload, "PlaylistObjects")) {
    const objectType = asString(object.ObjectType).toLocaleLowerCase();
    const nestedPlaylists = recordArray(object, "Playlists");
    const isCategory = objectType.includes("category") || object.Playlists !== undefined;
    if (isCategory) {
      const categoryId = asString(object.PlaylistCategoryID || object.ID);
      nestedPlaylists.forEach((item) => {
        playlists.push({
          ...mapPlaylist({ ...item, PlaylistCategoryID: asString(item.PlaylistCategoryID) || categoryId }, templates),
          isFeatured: false,
        });
      });
      continue;
    }
    if (asString(object.ID)) {
      playlists.push({ ...mapPlaylist(object, templates), isFeatured: false });
    }
  }
  return playlists;
}

export async function getMemberPlaylist(memberToken: string, playlistId: string): Promise<Playlist | null> {
  const [payload, templates] = await Promise.all([
    memberRequest<HarvestRecord>(memberToken, (token) => `/getmemberplaylist/${token}/${encodeURIComponent(playlistId)}?returntracks=true&returnpublishlocations=false`),
    getAssetTemplates(memberToken),
  ]);
  const item = recordArray(payload, "Playlists")[0];
  if (!item) return null;
  return { ...mapPlaylist(item, templates), isFeatured: false, tracks: recordArray(item, "Tracks").map((track) => mapTrack(track, templates, undefined, "member-playlist")) };
}

function mapMemberPlaylistCategory(item: HarvestRecord): MemberPlaylistCategory {
  return {
    id: asString(item.PlaylistCategoryID || item.ID),
    name: asString(item.PlaylistCategoryName || item.Name, "Sans titre"),
    description: asString(item.PlaylistCategoryDescription || item.Description) || undefined,
    color: asString(item.ColorHex || item.ColourHex) || undefined,
    playlistCount: asNumber(item.PlaylistCount || item.PlaylistsCount || item.TotalPlaylists || recordArray(item, "Playlists").length),
    createdAt: asIsoDate(item.CreateDate || item.CreatedDate),
    updatedAt: asIsoDate(item.LastUpdateDate || item.LastUpdated),
  };
}

export async function getMemberPlaylistCategories(
  memberToken: string,
  skip = 0,
  limit = 100,
): Promise<MemberPlaylistCategory[]> {
  const payload = await memberRequest<HarvestRecord>(
    memberToken,
    (token) =>
      `/getmemberplaylistcategories/${token}?Skip=${skip}&Limit=${limit}&Sort=Alphabetic_Asc&returnplaylistcount=true`,
  );
  return recordArray(payload, "PlaylistCategories")
    .map(mapMemberPlaylistCategory)
    .filter((category) => category.id);
}

export async function createMemberPlaylistCategory(
  memberToken: string,
  input: { name: string; description?: string; color?: string; addToTop?: boolean },
): Promise<MemberPlaylistCategory> {
  const before = await getMemberPlaylistCategories(memberToken, 0, 500);
  const beforeIds = new Set(before.map((category) => category.id));
  const payload = await memberRequest<HarvestRecord>(
    memberToken,
    (token) => `/addmemberplaylistcategory/${token}`,
    {
      method: "POST",
      body: JSON.stringify(buildPlaylistCategory(
        input.name,
        input.description,
        input.color,
        input.addToTop,
      )),
    },
  );
  const responseItem = recordArray(payload, "PlaylistCategories")[0];
  const responseId = responseItem ? mapMemberPlaylistCategory(responseItem).id : "";
  for (let index = 0; index < WRITE_VERIFICATION_OFFSETS_MS.length; index += 1) {
    await waitForVerificationOffset(index);
    const created = (await getMemberPlaylistCategories(memberToken, 0, 500)).find((category) =>
      (responseId ? category.id === responseId : !beforeIds.has(category.id)) &&
      category.name === input.name,
    );
    if (created) return created;
  }
  throw new HarvestError(
    "Harvest acknowledged the playlist category but it could not be verified",
    "HARVEST_INVALID_RESPONSE",
    502,
    false,
    "ACK_UNVERIFIED",
  );
}

export async function updateMemberPlaylistCategory(
  memberToken: string,
  categoryId: string,
  input: { name: string; description?: string; color?: string },
): Promise<MemberPlaylistCategory> {
  await memberRequest(
    memberToken,
    (token) => `/updatememberplaylistcategory/${token}/${encodeURIComponent(categoryId)}`,
    {
      method: "POST",
      body: JSON.stringify(buildUpdatePlaylistCategory(input.name, input.description, input.color)),
    },
  );
  for (let index = 0; index < WRITE_VERIFICATION_OFFSETS_MS.length; index += 1) {
    await waitForVerificationOffset(index);
    const updated = (await getMemberPlaylistCategories(memberToken, 0, 500))
      .find((category) => category.id === categoryId && category.name === input.name);
    if (updated) return updated;
  }
  throw new HarvestError(
    "Harvest acknowledged the playlist category update but it could not be verified",
    "HARVEST_INVALID_RESPONSE",
    502,
    false,
    "ACK_UNVERIFIED",
  );
}

export async function removeMemberPlaylistCategory(
  memberToken: string,
  categoryId: string,
): Promise<void> {
  await memberRequest(
    memberToken,
    (token) =>
      `/removememberplaylistcategory/${token}/${encodeURIComponent(categoryId)}?keepChildren=true&giveShareCopy=false`,
  );
  for (let index = 0; index < WRITE_VERIFICATION_OFFSETS_MS.length; index += 1) {
    await waitForVerificationOffset(index);
    const categories = await getMemberPlaylistCategories(memberToken, 0, 500);
    if (!categories.some((category) => category.id === categoryId)) return;
  }
  throw new HarvestError(
    "Harvest acknowledged the playlist category deletion but it is still present",
    "HARVEST_INVALID_RESPONSE",
    502,
    false,
    "ACK_UNVERIFIED",
  );
}

export async function moveMemberPlaylistToCategory(
  memberToken: string,
  playlistId: string,
  categoryId: string,
  orderId = 0,
): Promise<void> {
  await memberRequest(
    memberToken,
    (token) =>
      `/reordermemberplaylist/${token}/${encodeURIComponent(playlistId)}?movetoplaylistcategoryid=${encodeURIComponent(categoryId)}&orderid=${orderId}`,
  );
  for (let index = 0; index < WRITE_VERIFICATION_OFFSETS_MS.length; index += 1) {
    await waitForVerificationOffset(index);
    const payload = await memberRequest<HarvestRecord>(
      memberToken,
      (token) =>
        `/getmemberplaylistcategoriesandplaylists/${token}?returnplaylistcount=true&returntrackcount=true&returnrootobjectsonly=${categoryId ? "false" : "true"}&returnautosaveonly=false&returnfirstautosave=false&returnhighlightonly=false&playlistcategoryid=${encodeURIComponent(categoryId)}&skip=0&limit=500&sort=Custom_Asc`,
    );
    if (containsHarvestId(payload.PlaylistObjects || payload, playlistId)) return;
  }
  throw new HarvestError(
    "Harvest acknowledged the playlist move but its destination could not be verified",
    "HARVEST_INVALID_RESPONSE",
    502,
    false,
    "ACK_UNVERIFIED",
  );
}

export async function duplicateMemberPlaylist(
  memberToken: string,
  sourcePlaylistId: string,
  name?: string,
): Promise<Playlist> {
  const before = await getMemberPlaylists(memberToken, 0, 500);
  const beforeIds = new Set(before.map((playlist) => playlist.id));
  const source = await getMemberPlaylist(memberToken, sourcePlaylistId);
  if (!source) throw new HarvestError("Member playlist not found", "NOT_FOUND", 404);
  const expectedName = name || `${source.title} Copy`;
  const payload = await memberRequest<HarvestRecord>(
    memberToken,
    (token) => `/duplicatememberplaylist/${token}`,
    {
      method: "POST",
      body: JSON.stringify(buildDuplicateMemberPlaylist(sourcePlaylistId, name)),
    },
  );
  const responseId = asString(recordArray(payload, "Playlists")[0]?.ID);
  const duplicate = await pollForMemberPlaylist(
    memberToken,
    (playlist) =>
      (responseId ? playlist.id === responseId : !beforeIds.has(playlist.id)) &&
      (!name || playlist.title === expectedName),
  );
  if (!duplicate) {
    throw new HarvestError(
      "Harvest acknowledged the playlist duplicate but it could not be verified",
      "HARVEST_INVALID_RESPONSE",
      502,
      false,
      "ACK_UNVERIFIED",
    );
  }
  const sourceTrackIds = source.tracks?.map((track) => track.id) || [];
  const duplicateTrackIds = duplicate.tracks?.map((track) => track.id) || [];
  if (
    sourceTrackIds.length !== duplicateTrackIds.length ||
    sourceTrackIds.some((trackId, index) => duplicateTrackIds[index] !== trackId)
  ) {
    await removeMemberPlaylist(memberToken, duplicate.id).catch(() => undefined);
    throw new HarvestError(
      "Harvest duplicated the playlist but its tracks or order differ from the source",
      "HARVEST_INVALID_RESPONSE",
      502,
      false,
      "ACK_UNVERIFIED",
    );
  }
  return duplicate;
}

export async function searchMemberPlaylistTracks(
  memberToken: string,
  playlistId: string,
  input: { keyword: string; skip?: number; limit?: number; orderBy?: string },
) {
  const [payload, templates] = await Promise.all([
    memberRequest<HarvestRecord>(
      memberToken,
      (token) => `/searchmemberplaylisttracks/${token}/${encodeURIComponent(playlistId)}`,
      {
        method: "POST",
        body: JSON.stringify(buildSearchMemberPlaylistTracks(input.keyword, input)),
      },
    ),
    getAssetTemplates(memberToken),
  ]);
  const container = isRecord(payload.Playlists)
    ? payload.Playlists
    : isRecord(payload.Playlist)
      ? payload.Playlist
      : payload;
  const tracks = recordArray(container, "Tracks")
    .map((track) => mapTrack(track, templates, undefined, "member-playlist-search"));
  return {
    tracks,
    total: asNumber(
      container.TotalTracks || payload.TotalTracks || payload.TotalTrackCount,
      tracks.length,
    ),
  };
}

export async function setMemberPlaylistArchived(
  memberToken: string,
  playlistId: string,
  archived: boolean,
): Promise<void> {
  await memberRequest(
    memberToken,
    (token) =>
      `/${archived ? "archiveplaylist" : "restorearchiveplaylist"}/${token}/${encodeURIComponent(playlistId)}`,
  );
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
    body: JSON.stringify(buildCreateMemberPlaylist(input.title, input.description || "")),
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

export async function createMemberPlaylistWithTracks(
  memberToken: string,
  input: { title: string; description?: string; trackIds: string[] },
): Promise<Playlist> {
  const playlist = await createMemberPlaylist(memberToken, input);
  try {
    await addTracksToPlaylist(memberToken, playlist.id, input.trackIds);
    let verified = await pollMemberPlaylistState(
      memberToken,
      playlist.id,
      (candidate) => {
        const remoteIds = candidate?.tracks?.map((track) => track.id) || [];
        const available = new Set(remoteIds);
        return input.trackIds.every((trackId) => available.has(trackId));
      },
    );
    if (!verified) {
      throw new HarvestError("Harvest removed the playlist while adding tracks", "HARVEST_INVALID_RESPONSE");
    }
    const remoteOrder = verified.tracks?.map((track) => track.id) || [];
    if (
      remoteOrder.length === input.trackIds.length &&
      remoteOrder.some((trackId, index) => trackId !== input.trackIds[index])
    ) {
      await reorderPlaylistTracks(memberToken, playlist.id, input.trackIds);
      verified = await pollMemberPlaylistState(
        memberToken,
        playlist.id,
        (candidate) => {
          const candidateIds = candidate?.tracks?.map((track) => track.id) || [];
          return candidateIds.length === input.trackIds.length &&
            candidateIds.every((trackId, index) => trackId === input.trackIds[index]);
        },
      );
      if (!verified) {
        throw new HarvestError("Harvest removed the playlist while ordering tracks", "HARVEST_INVALID_RESPONSE");
      }
    }
    return verified;
  } catch (error) {
    await removeMemberPlaylist(memberToken, playlist.id).catch(() => undefined);
    throw error;
  }
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
    body: JSON.stringify(buildUpdateMemberPlaylist(input.title, input.description || "")),
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
    body: JSON.stringify(buildRemovePlaylistTracks(trackIds)),
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
    getAssetTemplates(memberToken),
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
  }, 20_000);
  return recordArray(payload, "SavedSearches")
    .map((item) => mapSavedSearch(item, utcOffsetHours))
    .filter((item) => item.id);
}

export async function createMemberSavedSearch(
  memberToken: string,
  input: { name: string; searchHistoryId: string; searchUrl: string },
  utcOffsetHours?: number,
): Promise<MemberSavedSearch> {
  const before = await getMemberSavedSearches(memberToken, utcOffsetHours);
  const beforeIds = new Set(before.map((search) => search.id));
  const payload = await memberRequest<HarvestRecord>(memberToken, (token) => `/addmembersavesearch/${token}`, {
    method: "POST",
    body: JSON.stringify(buildSavedSearch(input.name, `${SEARCH_URL_PREFIX}${input.searchUrl}`, input.searchHistoryId)),
  });
  const responseId = asString(recordItem(payload, "SavedSearches")?.ID);
  for (let index = 0; index < WRITE_VERIFICATION_OFFSETS_MS.length; index += 1) {
    await waitForVerificationOffset(index);
    const searches = await getMemberSavedSearches(memberToken, utcOffsetHours);
    const created = searches.find((search) =>
      (responseId ? search.id === responseId : !beforeIds.has(search.id)) &&
      search.name === input.name &&
      search.searchUrl === input.searchUrl,
    );
    if (created) return created;
  }
  throw new HarvestError(
    "Harvest acknowledged the saved search but the resulting resource could not be verified",
    "HARVEST_INVALID_RESPONSE",
    502,
    false,
    "ACK_UNVERIFIED",
  );
}

export async function removeMemberSavedSearch(memberToken: string, searchId: string): Promise<void> {
  await memberRequest(memberToken, (token) => `/removemembersavedsearch/${token}/${encodeURIComponent(searchId)}`);
  for (let index = 0; index < WRITE_VERIFICATION_OFFSETS_MS.length; index += 1) {
    await waitForVerificationOffset(index);
    const searches = await getMemberSavedSearches(memberToken);
    if (!searches.some((search) => search.id === searchId)) return;
  }
  throw new HarvestError(
    "Harvest acknowledged the saved search deletion but the resource is still present",
    "HARVEST_INVALID_RESPONSE",
    502,
    false,
    "ACK_UNVERIFIED",
  );
}

export async function updateMemberSavedSearch(
  memberToken: string,
  searchId: string,
  name: string,
  utcOffsetHours?: number,
): Promise<MemberSavedSearch> {
  const before = (await getMemberSavedSearches(memberToken, utcOffsetHours))
    .find((search) => search.id === searchId);
  if (!before) throw new HarvestError("Saved search not found", "NOT_FOUND", 404);
  const description = before.searchUrl
    ? `${SEARCH_URL_PREFIX}${before.searchUrl}`
    : before.description || "";
  const payload = await memberRequest<HarvestRecord>(memberToken, (token) =>
    `/updatemembersavesearch/${token}/${encodeURIComponent(searchId)}`, {
    method: "POST",
    body: JSON.stringify(buildUpdateSavedSearch(searchId, name, description)),
  });
  const responseItem = recordArray(payload, "SavedSearches")[0] ||
    (asString(payload.ID) ? payload : undefined);
  if (responseItem) {
    const responseSearch = mapSavedSearch(responseItem, utcOffsetHours);
    if (responseSearch.id === searchId && responseSearch.name === name) return responseSearch;
  }
  for (let index = 0; index < WRITE_VERIFICATION_OFFSETS_MS.length; index += 1) {
    await waitForVerificationOffset(index);
    const updated = (await getMemberSavedSearches(memberToken, utcOffsetHours))
      .find((search) => search.id === searchId && search.name === name);
    if (updated) return updated;
  }
  throw new HarvestError(
    "Harvest acknowledged the saved search update but the new name could not be verified",
    "HARVEST_INVALID_RESPONSE",
    502,
    false,
    "ACK_UNVERIFIED",
  );
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

async function pollTrackComment(
  memberToken: string,
  trackId: string,
  predicate: (comment: MemberTrackComment) => boolean,
): Promise<MemberTrackComment | null> {
  for (let index = 0; index < WRITE_VERIFICATION_OFFSETS_MS.length; index += 1) {
    await waitForVerificationOffset(index);
    const comment = (await getTrackComments(memberToken, trackId)).find(predicate);
    if (comment) return comment;
  }
  return null;
}

export async function createTrackComment(memberToken: string, trackId: string, text: string): Promise<MemberTrackComment> {
  await ensureTrackCommentIndexed(memberToken, trackId);
  const existingIds = new Set((await getTrackComments(memberToken, trackId)).map((comment) => comment.id));
  await memberRequest(memberToken, (token) => `/addtrackmembercomment/${token}`, {
    method: "POST",
    body: JSON.stringify(buildCreateTrackComment(trackId, text)),
  });
  const created = await pollTrackComment(
    memberToken,
    trackId,
    (comment) => !existingIds.has(comment.id) && comment.text === text,
  );
  if (!created) {
    throw new HarvestError(
      "Harvest acknowledged the private note but it could not be verified",
      "HARVEST_INVALID_RESPONSE",
      502,
      false,
      "ACK_UNVERIFIED",
    );
  }
  return created;
}

export async function updateTrackComment(memberToken: string, commentId: string, trackId: string, text: string): Promise<MemberTrackComment> {
  await ensureTrackCommentIndexed(memberToken, trackId);
  await memberRequest(memberToken, (token) => `/updatetrackmembercomment/${token}`, {
    method: "POST",
    body: JSON.stringify(buildUpdateTrackComment(commentId, text)),
  });
  const updated = await pollTrackComment(
    memberToken,
    trackId,
    (comment) => comment.id === commentId && comment.text === text,
  );
  if (!updated) {
    throw new HarvestError(
      "Harvest acknowledged the private note update but it could not be verified",
      "HARVEST_INVALID_RESPONSE",
      502,
      false,
      "ACK_UNVERIFIED",
    );
  }
  return updated;
}

export async function removeTrackComment(memberToken: string, trackId: string, commentId: string): Promise<void> {
  await memberRequest(memberToken, (token) => `/removetrackmembercomment/${token}/${encodeURIComponent(commentId)}`);
  for (let index = 0; index < WRITE_VERIFICATION_OFFSETS_MS.length; index += 1) {
    await waitForVerificationOffset(index);
    const comments = await getTrackComments(memberToken, trackId);
    if (!comments.some((comment) => comment.id === commentId)) {
      if (comments.length === 0) await removeTrackFromCommentIndex(memberToken, trackId).catch(() => undefined);
      return;
    }
  }
  throw new HarvestError(
    "Harvest acknowledged the private note deletion but the note is still present",
    "HARVEST_INVALID_RESPONSE",
    502,
    false,
    "ACK_UNVERIFIED",
  );
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

async function getRawMemberTags(memberToken: string, skip = 0, limit = 100): Promise<MemberTag[]> {
  const payload = await memberRequest<HarvestRecord>(memberToken, (token) => `/getmembertags/${token}?Skip=${skip}&Limit=${limit}&Sort=Alphabetic_Asc&ReturnTagCount=1`);
  return recordArray(payload, "Tags").map(mapMemberTag);
}

export async function getMemberTags(memberToken: string, skip = 0, limit = 100): Promise<MemberTag[]> {
  return (await getRawMemberTags(memberToken, skip, limit)).filter((tag) => !isReservedMemberTagName(tag.name));
}

export async function getMemberTagsWithTrackCounts(
  memberToken: string,
  skip = 0,
  limit = 100,
): Promise<MemberTag[]> {
  const tags = await getMemberTags(memberToken, skip, limit);
  const hydrated: MemberTag[] = [];
  const concurrency = 6;
  for (let offset = 0; offset < tags.length; offset += concurrency) {
    const batch = tags.slice(offset, offset + concurrency);
    hydrated.push(...await Promise.all(batch.map(async (tag) => ({
      ...tag,
      // ReturnTagCount is accepted by Harvest but has been observed returning
      // a stale zero. The relation endpoint remains the reliable source.
      trackCount: (await getMemberTagTracks(memberToken, tag.id, 0, 500)).length,
    }))));
  }
  return hydrated;
}

export async function getMemberTagsByTrack(memberToken: string, trackId: string): Promise<MemberTag[]> {
  const payload = await memberRequest<HarvestRecord>(
    memberToken,
    (token) => `/getmembertagsbytrack/${token}/${encodeURIComponent(trackId)}`,
  );
  return recordArray(payload, "Tags").map(mapMemberTag).filter((tag) => !isReservedMemberTagName(tag.name));
}

async function getTrackCommentIndexTag(memberToken: string): Promise<MemberTag | null> {
  return (await getRawMemberTags(memberToken, 0, 500)).find((tag) => isReservedMemberTagName(tag.name)) || null;
}

export async function assertPublicMemberTag(memberToken: string, tagId: string): Promise<void> {
  const tag = (await getRawMemberTags(memberToken, 0, 500)).find((candidate) => candidate.id === tagId);
  if (!tag || isReservedMemberTagName(tag.name)) {
    throw new HarvestError("Member tag not found", "NOT_FOUND", 404, false);
  }
}

async function ensureTrackCommentIndexed(memberToken: string, trackId: string): Promise<void> {
  await ensureTrackCommentsIndexed(memberToken, [trackId]);
}

async function ensureTrackCommentsIndexed(memberToken: string, trackIds: string[]): Promise<void> {
  if (trackIds.length === 0) return;
  const tag = await getTrackCommentIndexTag(memberToken) || await createMemberTag(memberToken, TRACK_COMMENT_INDEX_TAG_NAME);
  const indexedTracks = await getMemberTagTracks(memberToken, tag.id, 0, 500);
  const indexedIds = new Set(indexedTracks.map((track) => track.id));
  const missingIds = [...new Set(trackIds)].filter((trackId) => !indexedIds.has(trackId));
  for (let offset = 0; offset < missingIds.length; offset += 500) {
    await addTracksToMemberTags(memberToken, [tag.id], missingIds.slice(offset, offset + 500));
  }
}

async function removeTrackFromCommentIndex(memberToken: string, trackId: string): Promise<void> {
  const tag = await getTrackCommentIndexTag(memberToken);
  if (!tag) return;
  const indexedTracks = await getMemberTagTracks(memberToken, tag.id, 0, 500);
  if (indexedTracks.some((track) => track.id === trackId)) {
    await removeTrackFromMemberTag(memberToken, tag.id, trackId);
  }
}

export async function getCommentedTracks(memberToken: string): Promise<MemberTrackCommentGroup[]> {
  const tag = await getTrackCommentIndexTag(memberToken);
  if (!tag) return [];
  const tracks = await getMemberTagTracks(memberToken, tag.id, 0, 500);
  const groups: MemberTrackCommentGroup[] = [];
  const concurrency = 6;
  for (let offset = 0; offset < tracks.length; offset += concurrency) {
    const batch = tracks.slice(offset, offset + concurrency);
    const hydrated: Array<MemberTrackCommentGroup | null> = await Promise.all(batch.map(async (track) => {
      const comments = (await getTrackComments(memberToken, track.id)).sort((left, right) => {
        const leftTime = Date.parse(left.updatedAt || left.createdAt || "");
        const rightTime = Date.parse(right.updatedAt || right.createdAt || "");
        return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
      });
      if (!comments.length) return null;
      const lastActivityAt = comments[0]?.updatedAt || comments[0]?.createdAt;
      return { track, comments, ...(lastActivityAt ? { lastActivityAt } : {}) };
    }));
    hydrated.forEach((group) => { if (group) groups.push(group); });
  }
  return groups.sort((left, right) => {
    const leftTime = Date.parse(left.lastActivityAt || "");
    const rightTime = Date.parse(right.lastActivityAt || "");
    return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
  });
}

export async function syncTrackCommentIndex(
  memberToken: string,
  memberUtcOffsetHours?: number,
): Promise<{ scannedTracks: number; indexedTracks: number }> {
  const candidates = new Map<string, Track>();
  const addTracks = (tracks: Track[]) => {
    tracks.forEach((track) => {
      if (track.id && !candidates.has(track.id)) candidates.set(track.id, track);
    });
  };

  const [favourites, history, downloads, playlists, tags] = await Promise.all([
    getFavouriteTracks(memberToken, 0, 500).catch(() => []),
    getAuditionHistory(memberToken, 0, 500, memberUtcOffsetHours).catch(() => ({ items: [], total: 0 })),
    getDownloadHistory(memberToken, 0, 500).catch(() => ({ items: [], total: 0 })),
    getMemberPlaylists(memberToken, 0, 500).catch(() => []),
    getMemberTags(memberToken, 0, 500).catch(() => []),
  ]);
  addTracks(favourites);
  addTracks(history.items.map((entry) => entry.track));
  addTracks(downloads.items.map((entry) => entry.track));

  const sourceConcurrency = 6;
  for (let offset = 0; offset < playlists.length; offset += sourceConcurrency) {
    const batch = await Promise.all(playlists.slice(offset, offset + sourceConcurrency).map((playlist) =>
      getMemberPlaylist(memberToken, playlist.id).catch(() => null),
    ));
    batch.forEach((playlist) => addTracks(playlist?.tracks || []));
  }
  for (let offset = 0; offset < tags.length; offset += sourceConcurrency) {
    const batch = await Promise.all(tags.slice(offset, offset + sourceConcurrency).map((tag) =>
      getMemberTagTracks(memberToken, tag.id, 0, 500).catch(() => []),
    ));
    batch.forEach(addTracks);
  }

  const trackIdsWithComments: string[] = [];
  const candidateTracks = [...candidates.values()];
  for (let offset = 0; offset < candidateTracks.length; offset += sourceConcurrency) {
    const batch = candidateTracks.slice(offset, offset + sourceConcurrency);
    const comments = await Promise.all(batch.map((track) => getTrackComments(memberToken, track.id).catch(() => [])));
    comments.forEach((items, index) => {
      if (items.length) trackIdsWithComments.push(batch[index]!.id);
    });
  }
  await ensureTrackCommentsIndexed(memberToken, trackIdsWithComments);
  return { scannedTracks: candidateTracks.length, indexedTracks: trackIdsWithComments.length };
}

export async function getTrackRightHolders(memberToken: string | undefined, trackId: string): Promise<RightHolder[]> {
  const payload = memberToken
    ? await memberRequest<HarvestRecord>(
        memberToken,
        (token) => `/getrightholders/${token}/${encodeURIComponent(trackId)}`,
      )
    : await guestRequest<HarvestRecord>(
        (token) => `/getrightholders/${token}/${encodeURIComponent(trackId)}`,
      );
  return recordArray(payload, "RightHolders")
    .map(mapRightHolder)
    .filter((holder) => holder.id && holder.name);
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
  for (const tagId of tagIds) {
    let persisted = false;
    for (let index = 0; index < WRITE_VERIFICATION_OFFSETS_MS.length; index += 1) {
      await waitForVerificationOffset(index);
      const available = new Set((await getMemberTagTracks(memberToken, tagId)).map((track) => track.id));
      if (trackIds.every((trackId) => available.has(trackId))) {
        persisted = true;
        break;
      }
    }
    if (!persisted) {
      throw new HarvestError(
        "Harvest did not persist the requested track-tag association",
        "HARVEST_INVALID_RESPONSE",
        502,
        false,
      );
    }
  }
}

export async function getMemberTagTracks(memberToken: string, tagId: string, skip = 0, limit = 100): Promise<Track[]> {
  const [payload, templates] = await Promise.all([
    memberRequest<HarvestRecord>(memberToken, (token) => `/getmembertagtracks/${token}/${encodeURIComponent(tagId)}?Skip=${skip}&Limit=${limit}&Sort=Alphabetic_Asc`),
    getAssetTemplates(memberToken),
  ]);
  const tag = recordArray(payload, "Tags")[0];
  return tag ? recordArray(tag, "Tracks").map((track) => mapTrack(track, templates, undefined, "member-tag")) : [];
}

export async function removeTrackFromMemberTag(memberToken: string, tagId: string, trackId: string): Promise<void> {
  await memberRequest(memberToken, (token) => `/removetrackmembertag/${token}/${encodeURIComponent(tagId)}/${encodeURIComponent(trackId)}`);
  for (let index = 0; index < WRITE_VERIFICATION_OFFSETS_MS.length; index += 1) {
    await waitForVerificationOffset(index);
    const remaining = await getMemberTagTracks(memberToken, tagId);
    if (!remaining.some((track) => track.id === trackId)) return;
  }
  throw new HarvestError(
    "Harvest did not remove the requested track-tag association",
    "HARVEST_INVALID_RESPONSE",
    502,
    false,
  );
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
    getAssetTemplates(memberToken),
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

export function mapDownloadHistoryResponse(
  payload: HarvestRecord,
  templates: HarvestAssetTemplates,
) {
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
    const utcOffsetHours = asNumber(item.UTCOffset, Number.NaN);
    const downloadedAt = asIsoDate(
      item.DeliveryDate,
      Number.isFinite(utcOffsetHours) ? utcOffsetHours : undefined,
    );
    if (!track || !downloadedAt) return [];
    return [{
      id: `${trackId}-${asString(item.DeliveryDate, String(index))}-${index}`,
      downloadedAt,
      itemType: asString(item.ItemType) || "Download",
      utcOffsetHours: Number.isFinite(utcOffsetHours) ? utcOffsetHours : undefined,
      licenseType: "HARVEST",
      projectName: "",
      track: mapTrack(track, templates, undefined, "download-history"),
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
        `/getdownloadhistorybymembertoken/${token}?startdate=${start.toISOString().slice(0, 10)}&enddate=${end.toISOString().slice(0, 10)}&skip=${skip}&limit=${limit}`,
    ),
    getAssetTemplates(memberToken),
  ]);
  return mapDownloadHistoryResponse(payload, templates);
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
  const templates = downloadTokens.length ? await getAssetTemplates(memberToken) : null;
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

export async function getDownloadPreparationInfo(
  identifier: { downloadId: string } | { downloadGroupId: string },
  skip = 0,
  limit = 100,
) {
  const payload = await serviceRequest<HarvestRecord>(
    (token) => `/getmusicdownloadinfo/${token}`,
    {
      method: "POST",
      body: JSON.stringify(buildDownloadInfoQuery(identifier, skip, limit)),
    },
  );
  return mapDownloadInfo(payload);
}

export async function getMemberCommunications(
  memberToken: string,
  input: { skip?: number; limit?: number; startDate?: string; endDate?: string } = {},
): Promise<{ items: MemberCommunication[]; total: number }> {
  const payload = await memberRequest<HarvestRecord>(
    memberToken,
    (token) => `/gethistorybycommunications/${token}`,
    {
      method: "POST",
      body: JSON.stringify(buildCommunicationHistory(input)),
    },
  );
  const history = isRecord(payload.History) ? payload.History : payload;
  const rawItems = recordArray(history, "HistoryItems");
  const items = rawItems.map((item, index) => ({
    id: asString(item.ID, `${asString(item.Date)}-${index}`),
    type: asString(item.Type) || undefined,
    from: asString(item.From) || undefined,
    to: asString(item.To) || undefined,
    subject: asString(item.Subject) || undefined,
    status: asString(item.Status) || undefined,
    sentAt: asIsoDate(item.Date || item.CreatedDate),
  }));
  return {
    items,
    total: asNumber(history.TotalHistoryItems, items.length),
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
    { method: "POST", body: JSON.stringify(buildCueSheetTracks(trackIds)) },
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
