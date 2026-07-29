import { writeFile } from "node:fs/promises";
import { buildCloudSearch, searchHistoryIdFromResponse } from "../../../src/lib/harvest/search";

type RecordValue = Record<string, unknown>;

function object(value: unknown): RecordValue | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as RecordValue
    : undefined;
}

function array(value: unknown, key: string): RecordValue[] {
  const candidate = object(value)?.[key];
  return Array.isArray(candidate)
    ? candidate.filter((item): item is RecordValue => Boolean(object(item)))
    : [];
}

function findString(value: unknown, keys: string[]): string {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findString(item, keys);
      if (found) return found;
    }
    return "";
  }
  const source = object(value);
  if (!source) return "";
  for (const [key, nested] of Object.entries(source)) {
    if (keys.some((candidate) => candidate.toLowerCase() === key.toLowerCase()) &&
        (typeof nested === "string" || typeof nested === "number")) return String(nested);
  }
  for (const nested of Object.values(source)) {
    const found = findString(nested, keys);
    if (found) return found;
  }
  return "";
}

function containsIdentifier(value: unknown, identifier: string): boolean {
  if (Array.isArray(value)) return value.some((item) => containsIdentifier(item, identifier));
  const source = object(value);
  if (!source) return false;
  return Object.entries(source).some(([key, nested]) =>
    (key.toLowerCase() === "id" && String(nested) === identifier) ||
    containsIdentifier(nested, identifier));
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function envelope(payload: unknown) {
  const source = object(payload);
  const error = object(source?.Error || source?.error);
  return {
    topKeys: source ? Object.keys(source).sort() : [],
    errorCode: error?.Code == null ? null : String(error.Code),
    errorDescription: String(error?.Description || error?.Message || error?.message || "") || null,
  };
}

async function main() {
  if (process.env.HARVEST_MEMBER_CAPABILITIES_AUDIT !== "1") {
    console.log("Harvest member capabilities audit skipped.");
    return;
  }
  const authUrl = process.env.HARVEST_AUTH_URL || "https://auth.harvestmedia.net/oauth2/token";
  const serviceUrl = process.env.HARVEST_SERVICE_URL || "https://service.harvestmedia.net/HMP-WS.svc";
  const runId = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const prefix = `Parigo audit ${runId}`;
  const oauthResponse = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: required("HARVEST_CLIENT_ID"),
      client_secret: required("HARVEST_CLIENT_SECRET"),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const oauth = await oauthResponse.json();
  const accessToken = findString(oauth, ["access_token"]);
  if (!accessToken) throw new Error("OAuth token missing");
  const headers = { Accept: "application/json", Authorization: accessToken };
  const direct = async (path: string, body?: unknown) => {
    const response = await fetch(`${serviceUrl}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        ...headers,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(30_000),
    });
    return {
      status: response.status,
      date: response.headers.get("date"),
      payload: await response.json().catch(() => ({})),
    };
  };
  const serviceResponse = await fetch(`${serviceUrl}/getservicetoken`, {
    headers: { ...headers, AccessKey: required("HARVEST_ACCESS_KEY") },
    signal: AbortSignal.timeout(30_000),
  });
  const service = {
    status: serviceResponse.status,
    date: serviceResponse.headers.get("date"),
    payload: await serviceResponse.json().catch(() => ({})),
  };
  const serviceToken = findString(service.payload, ["Token", "Value"]);
  if (!serviceToken) {
    const facts = envelope(service.payload);
    throw new Error(`Service token missing (${service.status}; ${facts.errorCode}; ${facts.errorDescription})`);
  }
  const login = await direct(`/getmembertoken/${serviceToken}`, {
    UserName: required("HARVEST_TEST_MEMBER_EMAIL"),
    Password: required("HARVEST_TEST_MEMBER_PASSWORD"),
    PersistentLogin: true,
    ReturnMemberDetails: true,
  });
  const memberToken = findString(login.payload, ["MemberToken", "Value"]);
  if (!memberToken) throw new Error("Member token missing");
  const cleanupPrefixes = ["Parigo capability audit ", "Parigo audit "];
  const staleTags = await direct(`/getmembertags/${memberToken}?Skip=0&Limit=500&Sort=Alphabetic_Asc&ReturnTagCount=1`);
  for (const tag of array(staleTags.payload, "Tags")) {
    if (cleanupPrefixes.some((value) => String(tag.TagName || "").startsWith(value))) {
      const id = findString(tag, ["TagID", "ID"]);
      if (id) await direct(`/removemembertag/${memberToken}/${encodeURIComponent(id)}`);
    }
  }
  const staleSearches = await direct(`/searchmembersavesearches/${memberToken}`, {
    Keywords: "",
    Skip: 0,
    Limit: 500,
    Sort: "Created_Desc",
  });
  for (const searchItem of array(staleSearches.payload, "SavedSearches")) {
    const name = String(searchItem.Name || "");
    const id = findString(searchItem, ["ID"]);
    if (id && /^Parigo audit 2026072[89]-ui-/.test(name) && name.endsWith(" rename")) {
      await direct(`/updatemembersavesearch/${memberToken}/${encodeURIComponent(id)}`, {
        ID: id,
        Name: "Birthday",
        Description: String(searchItem.Description || ""),
        SearchHistoryID: "",
      });
    } else if (id && /^Parigo audit 2026072[89]-ui-/.test(name) && name.endsWith(" saved search")) {
      await direct(`/removemembersavedsearch/${memberToken}/${encodeURIComponent(id)}`);
    }
  }
  const stalePlaylists = await direct(`/getmemberplaylistsnotracks/${memberToken}?Skip=0&Limit=500`);
  for (const playlist of array(stalePlaylists.payload, "Playlists")) {
    if (cleanupPrefixes.some((value) => String(playlist.Name || "").startsWith(value))) {
      const id = findString(playlist, ["ID"]);
      if (id) await direct(`/removeplaylist/${memberToken}/${encodeURIComponent(id)}`);
    }
  }
  const staleCategories = await direct(`/getmemberplaylistcategories/${memberToken}?Skip=0&Limit=500&Sort=Alphabetic_Asc&returnplaylistcount=true`);
  for (const category of array(staleCategories.payload, "PlaylistCategories")) {
    if (cleanupPrefixes.some((value) =>
      String(category.PlaylistCategoryName || category.Name || "").startsWith(value))) {
      const id = findString(category, ["PlaylistCategoryID", "ID"]);
      if (id) {
        await direct(`/removememberplaylistcategory/${memberToken}/${encodeURIComponent(id)}?keepChildren=true&giveShareCopy=false`);
      }
    }
  }
  console.log(JSON.stringify({ stage: "stale-audit-cleanup", complete: true }));

  const regionId = findString(login.payload, ["RegionID"]);
  const search = await direct(`/cloudsearch/${memberToken}`, buildCloudSearch({
    query: "piano",
    view: "Track",
    textScope: "aggregate",
    limit: 5,
    type: "main",
    regionId,
    saveSearchHistory: true,
  }));
  const trackId = findString(array(search.payload, "Tracks")[0], ["ID"]);
  const searchHistoryId = searchHistoryIdFromResponse(object(search.payload) || {});
  if (!trackId) throw new Error("No track fixture returned by cloudsearch");

  const results: Array<RecordValue> = [];
  const recordResult = (capability: string, response: Awaited<ReturnType<typeof direct>>, facts: RecordValue = {}) => {
    results.push({
      capability,
      status: response.status,
      httpDate: response.date,
      ...envelope(response.payload),
      ...facts,
    });
  };

  const rightHolders = await direct(`/getrightholders/${memberToken}/${encodeURIComponent(trackId)}`);
  recordResult("structured-right-holders", rightHolders, {
    count: array(rightHolders.payload, "RightHolders").length,
  });
  const communications = await direct(`/gethistorybycommunications/${memberToken}`, {
    Skip: 0,
    Limit: 10,
    Sort: "Created_Desc",
    StartDate: "",
    EndDate: "",
  });
  const communicationHistory = object(communications.payload)?.History || communications.payload;
  recordResult("communication-history", communications, {
    count: array(communicationHistory, "HistoryItems").length,
  });
  console.log(JSON.stringify({ stage: "read-capabilities", complete: true }));

  let tagId = "";
  try {
    const tagCreate = await direct(`/addmembertag/${memberToken}`, { TagName: `${prefix} tag` });
    tagId = findString(tagCreate.payload, ["TagID", "ID"]);
    recordResult("tag-create", tagCreate, { resourceReturned: Boolean(tagId) });
    if (tagId) {
      const add = await direct(`/addtomembertags/${memberToken}`, {
        ObjectType: "Track",
        ObjectIDs: [trackId],
        AddToTagIDs: [tagId],
      });
      const linked = await direct(`/getmembertagsbytrack/${memberToken}/${encodeURIComponent(trackId)}`);
      recordResult("tags-by-track", linked, {
        addAcknowledged: add.status === 200 && !envelope(add.payload).errorCode,
        linked: array(linked.payload, "Tags").some((tag) =>
          findString(tag, ["TagID", "ID"]) === tagId),
      });
      await direct(`/removetrackmembertag/${memberToken}/${encodeURIComponent(tagId)}/${encodeURIComponent(trackId)}`);
    }
  } finally {
    if (tagId) await direct(`/removemembertag/${memberToken}/${encodeURIComponent(tagId)}`);
  }
  console.log(JSON.stringify({ stage: "tag-capability", complete: true }));

  let savedSearchId = "";
  if (searchHistoryId) {
    try {
      const created = await direct(`/addmembersavesearch/${memberToken}`, {
        Name: `${prefix} search`,
        Description: "PARIGO_URL:/search?q=piano",
        SearchHistoryID: searchHistoryId,
      });
      savedSearchId = findString(created.payload, ["ID"]);
      if (!savedSearchId) {
        const listing = await direct(`/searchmembersavesearches/${memberToken}`, {
          Keywords: prefix,
          Skip: 0,
          Limit: 100,
          Sort: "Created_Desc",
        });
        savedSearchId = findString(
          array(listing.payload, "SavedSearches").find((item) =>
            String(item.Name || "").startsWith(prefix)),
          ["ID"],
        );
      }
      recordResult("saved-search-create", created, { resourcePersisted: Boolean(savedSearchId) });
      if (savedSearchId) {
        const renamed = await direct(
          `/updatemembersavesearch/${memberToken}/${encodeURIComponent(savedSearchId)}`,
          {
            ID: savedSearchId,
            Name: `${prefix} renamed`,
            Description: "PARIGO_URL:/search?q=piano",
            SearchHistoryID: "",
          },
        );
        const listing = await direct(`/searchmembersavesearches/${memberToken}`, {
          Keywords: prefix,
          Skip: 0,
          Limit: 100,
          Sort: "Created_Desc",
        });
        recordResult("saved-search-rename", renamed, {
          persisted: array(listing.payload, "SavedSearches").some((item) =>
            findString(item, ["ID"]) === savedSearchId &&
            String(item.Name || "") === `${prefix} renamed`),
        });
      }
    } finally {
      if (savedSearchId) {
        await direct(`/removemembersavedsearch/${memberToken}/${encodeURIComponent(savedSearchId)}`);
      }
    }
  } else {
    const existingResponse = await direct(`/searchmembersavesearches/${memberToken}`, {
      Keywords: "",
      Skip: 0,
      Limit: 100,
      Sort: "Created_Desc",
    });
    const existing = array(existingResponse.payload, "SavedSearches")[0];
    const existingId = findString(existing, ["ID"]);
    const existingName = String(existing?.Name || "");
    const existingDescription = String(existing?.Description || "");
    if (existingId && existingName) {
      const temporaryName = `Parigo audit ${runId}`;
      const renamed = await direct(
        `/updatemembersavesearch/${memberToken}/${encodeURIComponent(existingId)}`,
        {
          ID: existingId,
          Name: temporaryName,
          Description: existingDescription,
          SearchHistoryID: "",
        },
      );
      const restored = await direct(
        `/updatemembersavesearch/${memberToken}/${encodeURIComponent(existingId)}`,
        {
          ID: existingId,
          Name: existingName,
          Description: existingDescription,
          SearchHistoryID: "",
        },
      );
      recordResult("saved-search-rename-existing-and-restore", renamed, {
        restored: restored.status === 200 && !envelope(restored.payload).errorCode,
      });
    } else {
      results.push({ capability: "saved-search-rename", tested: false, reason: "cloudsearch returned no SearchHistoryID and no saved search exists" });
    }
  }
  if (!savedSearchId) {
    const existingResponse = await direct(`/searchmembersavesearches/${memberToken}`, {
      Keywords: "",
      Skip: 0,
      Limit: 100,
      Sort: "Created_Desc",
    });
    const existing = array(existingResponse.payload, "SavedSearches")[0];
    const existingId = findString(existing, ["ID"]);
    const existingName = String(existing?.Name || "");
    const existingDescription = String(existing?.Description || "");
    if (existingId && existingName) {
      const renamed = await direct(
        `/updatemembersavesearch/${memberToken}/${encodeURIComponent(existingId)}`,
        {
          ID: existingId,
          Name: `Parigo audit ${runId}`,
          Description: existingDescription,
          SearchHistoryID: "",
        },
      );
      const restored = await direct(
        `/updatemembersavesearch/${memberToken}/${encodeURIComponent(existingId)}`,
        {
          ID: existingId,
          Name: existingName,
          Description: existingDescription,
          SearchHistoryID: "",
        },
      );
      recordResult("saved-search-rename-existing-and-restore", renamed, {
        restored: restored.status === 200 && !envelope(restored.payload).errorCode,
      });
    }
  }
  console.log(JSON.stringify({ stage: "saved-search-capability", complete: true }));

  let categoryId = "";
  let duplicateId = "";
  try {
    const categoryCreate = await direct(`/addmemberplaylistcategory/${memberToken}`, {
      PlaylistCategoryName: `${prefix} F`,
      PlaylistCategoryDescription: "Temporary audit folder",
      ColorHex: "#54745E",
      AddToTop: true,
    });
    categoryId = findString(categoryCreate.payload, ["PlaylistCategoryID", "ID"]);
    if (!categoryId) {
      const categoryList = await direct(`/getmemberplaylistcategories/${memberToken}?Skip=0&Limit=500&Sort=Alphabetic_Asc&returnplaylistcount=true`);
      categoryId = findString(
        array(categoryList.payload, "PlaylistCategories").find((item) =>
          String(item.PlaylistCategoryName || item.Name || "") === `${prefix} F`),
        ["PlaylistCategoryID", "ID"],
      );
    }
    recordResult("playlist-category-create", categoryCreate, { resourcePersisted: Boolean(categoryId) });
    if (categoryId) {
      const updated = await direct(
        `/updatememberplaylistcategory/${memberToken}/${encodeURIComponent(categoryId)}`,
        {
          PlaylistCategoryName: `${prefix} R`,
          PlaylistCategoryDescription: "Temporary audit folder",
          ColorHex: "#54745E",
        },
      );
      recordResult("playlist-category-update", updated);
    }

    const playlists = await direct(`/getmemberplaylistsnotracks/${memberToken}?Skip=0&Limit=500`);
    const sourcePlaylistId = findString(array(playlists.payload, "Playlists")[0], ["ID"]);
    if (sourcePlaylistId) {
      const duplicate = await direct(`/duplicatememberplaylist/${memberToken}`, {
        SourcePlaylistID: sourcePlaylistId,
        DuplicatePlaylistName: `${prefix} duplicate`,
      });
      duplicateId = findString(duplicate.payload, ["ID"]);
      if (!duplicateId) {
        const afterDuplicate = await direct(`/getmemberplaylistsnotracks/${memberToken}?Skip=0&Limit=500`);
        duplicateId = findString(
          array(afterDuplicate.payload, "Playlists").find((item) =>
            String(item.Name || "") === `${prefix} duplicate`),
          ["ID"],
        );
      }
      recordResult("member-playlist-duplicate", duplicate, { resourcePersisted: Boolean(duplicateId) });
      if (duplicateId) {
        const trackSearch = await direct(
          `/searchmemberplaylisttracks/${memberToken}/${encodeURIComponent(duplicateId)}`,
          {
            Keyword: "",
            Fields: "TrackDisplayTitle,TrackDescription",
            ReturnTrackCount: true,
            Skip: 0,
            Limit: 50,
            OrderBy: "Custom_ASC",
          },
        );
        recordResult("member-playlist-track-search", trackSearch, {
          trackCount: array(trackSearch.payload, "Tracks").length,
        });
        if (categoryId) {
          const moved = await direct(
            `/reordermemberplaylist/${memberToken}/${encodeURIComponent(duplicateId)}?movetoplaylistcategoryid=${encodeURIComponent(categoryId)}&orderid=0`,
          );
          const hierarchy = await direct(
            `/getmemberplaylistcategoriesandplaylists/${memberToken}?returnplaylistcount=true&returntrackcount=true&returnrootobjectsonly=false&returnautosaveonly=false&returnfirstautosave=false&returnhighlightonly=false&playlistcategoryid=${encodeURIComponent(categoryId)}&skip=0&limit=500&sort=Custom_Asc`,
          );
          recordResult("member-playlist-folder-move", moved, {
            hierarchyStatus: hierarchy.status,
            hierarchyTopKeys: envelope(hierarchy.payload).topKeys,
            persistedInHierarchy: containsIdentifier(hierarchy.payload, duplicateId),
          });
        }
        const archived = await direct(`/archiveplaylist/${memberToken}/${encodeURIComponent(duplicateId)}`);
        const afterArchive = await direct(`/getmemberplaylistsnotracks/${memberToken}?Skip=0&Limit=500`);
        const absentFromActive = !array(afterArchive.payload, "Playlists").some((item) =>
          findString(item, ["ID"]) === duplicateId);
        const restored = await direct(`/restorearchiveplaylist/${memberToken}/${encodeURIComponent(duplicateId)}`);
        const afterRestore = await direct(`/getmemberplaylistsnotracks/${memberToken}?Skip=0&Limit=500`);
        recordResult("member-playlist-archive-restore", restored, {
          archiveAcknowledged: archived.status === 200 && !envelope(archived.payload).errorCode,
          absentFromActive,
          restoredToActive: array(afterRestore.payload, "Playlists").some((item) =>
            findString(item, ["ID"]) === duplicateId),
        });
      }
    } else {
      results.push({ capability: "member-playlist-duplicate", tested: false, reason: "no source member playlist" });
    }
  } finally {
    if (duplicateId) await direct(`/removeplaylist/${memberToken}/${encodeURIComponent(duplicateId)}`);
    if (categoryId) {
      await direct(`/removememberplaylistcategory/${memberToken}/${encodeURIComponent(categoryId)}?keepChildren=true&giveShareCopy=false`);
    }
  }
  console.log(JSON.stringify({ stage: "playlist-capabilities", complete: true }));

  const downloadHistory = await direct(
    `/getdownloadhistorybymembertoken/${memberToken}?startdate=2025-07-29&enddate=2026-07-29&skip=0&limit=100`,
  );
  const downloadId = findString(downloadHistory.payload, ["DownloadID"]);
  const downloadGroupId = findString(downloadHistory.payload, ["DownloadGroupID"]);
  if (downloadId || downloadGroupId) {
    const info = await direct(`/getmusicdownloadinfo/${serviceToken}`, {
      Skip: 0,
      Limit: 100,
      ...(downloadId ? { DownloadID: downloadId } : { DownloadGroupID: downloadGroupId }),
    });
    recordResult("grouped-download-info", info, {
      identifierAvailable: true,
      itemCount: array(info.payload, "Downloads").length,
    });
  } else {
    results.push({
      capability: "grouped-download-info",
      tested: false,
      reason: "download history exposes neither DownloadID nor DownloadGroupID",
    });
  }

  const report = {
    runId,
    generatedAt: new Date().toISOString(),
    accountDeleted: false,
    resourcesCleaned: true,
    results,
  };
  await writeFile(
    new URL("../last-capability-run.json", import.meta.url),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  console.log(JSON.stringify(report));
}

const keepAlive = setInterval(() => undefined, 1_000);
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => clearInterval(keepAlive));
