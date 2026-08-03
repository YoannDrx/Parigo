import { writeFile } from "node:fs/promises";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : undefined;
}

function findString(value: unknown, keys: string[]): string {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findString(item, keys);
      if (found) return found;
    }
    return "";
  }
  const source = record(value);
  if (!source) return "";
  for (const [key, nested] of Object.entries(source)) {
    if (keys.some((candidate) => candidate.toLowerCase() === key.toLowerCase()) &&
        (typeof nested === "string" || typeof nested === "number") && String(nested)) {
      return String(nested);
    }
  }
  for (const nested of Object.values(source)) {
    const found = findString(nested, keys);
    if (found) return found;
  }
  return "";
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function logicalError(payload: unknown): JsonRecord | string | null {
  const source = record(payload);
  const candidate = source?.Error ?? source?.error;
  return record(candidate) ?? (typeof candidate === "string" ? candidate : null);
}

async function main() {
  if (process.env.HARVEST_PUBLIC_READ_AUDIT !== "1") {
    console.log("Harvest public read conformance audit skipped.");
    return;
  }

  const authUrl = process.env.HARVEST_AUTH_URL || "https://auth.harvestmedia.net/oauth2/token";
  const serviceUrl = process.env.HARVEST_SERVICE_URL || "https://service.harvestmedia.net/HMP-WS.svc";
  const results: JsonRecord[] = [];
  const oauthResponse = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept-Encoding": "identity" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: required("HARVEST_CLIENT_ID"),
      client_secret: required("HARVEST_CLIENT_SECRET"),
    }),
  });
  const oauth = await oauthResponse.json() as JsonRecord;
  const accessToken = findString(oauth, ["access_token"]);
  if (!accessToken) throw new Error("OAuth access token missing");
  results.push({ endpoint: "oauth2/token", status: oauthResponse.status, topKeys: Object.keys(oauth) });

  const baseHeaders = {
    Accept: "application/json",
    Authorization: accessToken,
    "Accept-Encoding": "identity",
  };

  async function call(endpoint: string, path: string, body?: unknown, extraHeaders?: Record<string, string>) {
    try {
      const response = await fetch(`${serviceUrl}${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          ...baseHeaders,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...extraHeaders,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
      const text = await response.text();
      let payload: unknown;
      try { payload = JSON.parse(text); } catch { payload = { nonJsonBody: text.slice(0, 160) }; }
      const source = record(payload);
      const row = {
        endpoint,
        status: response.status,
        topKeys: source ? Object.keys(source).sort() : [],
        logicalError: logicalError(payload),
        arrays: source
          ? Object.fromEntries(Object.entries(source)
            .filter(([, value]) => Array.isArray(value))
            .map(([key, value]) => [key, (value as unknown[]).length]))
          : {},
      };
      results.push(row);
      console.log(JSON.stringify(row));
      return payload;
    } catch (error) {
      const row = {
        endpoint,
        transportError: error instanceof Error ? error.message : String(error),
      };
      results.push(row);
      console.log(JSON.stringify(row));
      return undefined;
    }
  }

  const service = await call("getservicetoken", "/getservicetoken", undefined, {
    AccessKey: required("HARVEST_ACCESS_KEY"),
  });
  const serviceToken = findString(service, ["Value", "Token"]);
  if (!serviceToken) throw new Error("Service token missing");
  await call("getservicetokeninfo (service)", `/getservicetokeninfo/${serviceToken}`);
  const serviceInfo = await call("getserviceinfo", `/getserviceinfo/${serviceToken}`);
  const regions = await call("getregions", `/getregions/${serviceToken}`);
  const regionId = findString(regions, ["ID", "RegionID"]);
  await call("getregion", `/getregion/${serviceToken}/${regionId}`);
  await call("getregionbyip", `/getregionbyip/${serviceToken}?ip=8.8.8.8`);
  await call("getcountries", `/getcountries/${serviceToken}`);
  const guest = await call("getguestmembertoken", `/getguestmembertoken/${serviceToken}/${regionId}`);
  const guestToken = findString(guest, ["Value", "Token"]);
  if (!guestToken) throw new Error("Guest token missing");

  const libraries = await call("getlibraries", `/getlibraries/${guestToken}`);
  await call("getlibraries includeinactive", `/getlibraries/${guestToken}/includeinactive`);
  const libraryId = findString(libraries, ["ID", "LibraryID"]);
  await call("getlibrary", `/getlibrary/${guestToken}/${libraryId}?returnCodes=true`);
  const styleGroups = await call("getstylegroups", `/getstylegroups/${guestToken}`);
  const styleGroupId = findString(styleGroups, ["ID", "GroupID"]);
  let styles = await call(
    "getstyles",
    `/getstyles/${guestToken}?groupID=${encodeURIComponent(styleGroupId)}&allowEmptyStyle=false`,
  );
  await call(
    "getstyles language",
    `/getstyles/${guestToken}/en?groupID=${encodeURIComponent(styleGroupId)}`,
  );
  let styleId = findString(styles, ["ID", "StyleID"]);
  if (!styleId) {
    styles = await call("getstyles without group", `/getstyles/${guestToken}?allowEmptyStyle=false`);
    styleId = findString(styles, ["ID", "StyleID"]);
  }

  const albums = await call("getalbums", `/getalbums/${guestToken}/${libraryId}`);
  await call("getalbums includeinactive", `/getalbums/${guestToken}/${libraryId}/includeinactive`);
  if (styleId) {
    await call("getalbumsbystyles documented JSON", `/getalbumsbystyles/${guestToken}`, {
      style: [{ id: styleId }],
      mainOnly: false,
    });
  } else {
    results.push({ endpoint: "getalbumsbystyles documented JSON", skipped: "No style ID returned for selected group" });
  }
  const albumId = findString(albums, ["ID", "AlbumID"]);
  await call("getalbumsbyids documented JSON", `/getalbumsbyids/${guestToken}`, {
    albumid: [{ id: albumId }],
  });
  await call(
    "getfeaturedalbums",
    `/getfeaturedalbums/${guestToken}/5?returntrackcount=true&mainonly=true&sort=Created_Desc`,
  );
  await call("getlatestalbums", `/getlatestalbums/${guestToken}/5`);
  await call("getalbum", `/getalbum/${guestToken}/${albumId}?returnLibraryCodes=true`);
  const albumTracks = await call(
    "getalbumtracks mainonly",
    `/getalbumtracks/${guestToken}/${albumId}/mainonly?skip=0&limit=10`,
  );
  await call(
    "getalbumtracks includeinactive",
    `/getalbumtracks/${guestToken}/${albumId}/includeinactive?skip=0&limit=10`,
  );
  const trackId = findString(albumTracks, ["ID", "TrackID"]);
  await call("gettracks documented JSON", `/gettracks/${guestToken}`, {
    ReturnAlternateVersions: "true",
    ReturnAttributes: "true",
    ReturnCategories: "true",
    ReturnCategoryFacet: "true",
    ReturnCodes: "true",
    ReturnComposers: "false",
    ReturnRelatedTracks: "false",
    ReturnRightHolders: "true",
    GetMainVersionFromAlternate: "false",
    CuesheetOnlyCodesAndAttribute: "false",
    ReturnInactiveTracks: "false",
    ReturnRegionOnlyTracks: "false",
    Offset: "0",
    Limit: "10",
    track: [trackId],
  });
  await call("getcategories", `/getcategories/${guestToken}/hasactivetrackonly?languagecode=en`);
  const rightHolders = await call("getrightholders", `/getrightholders/${guestToken}/${trackId}`);
  const rightHolderId = findString(rightHolders, ["ID", "RightHolderID"]);
  if (rightHolderId) {
    await call("gettoptracks corrected JSON", `/gettoptracks/${guestToken}`, {
      RelationType: "RightHolder",
      RelationTypeID: rightHolderId,
      Metric: "Download",
      MetricDetermination: "TotalCount",
      MetricRange: null,
      PopularityDecay: 0.95,
      TrackType: "MainOnly",
      Skip: 0,
      Limit: 10,
    });
  }

  await call(
    "getfeaturedplaylistcategories",
    `/getfeaturedplaylistcategories/${guestToken}?returnplaylistcount=true&skip=0&limit=10&sort=Custom_Asc`,
  );
  await call(
    "getfeaturedplaylistcategoriesandplaylists",
    `/getfeaturedplaylistcategoriesandplaylists/${guestToken}?returnplaylistcount=true&returntrackcount=true&returnrootobjectsonly=false&playlistcategoryid=&skip=0&limit=10&sort=Custom_Asc`,
  );
  const featuredPlaylists = await call(
    "getfeaturedplaylistsplaylistonly",
    `/getfeaturedplaylistsplaylistonly/${guestToken}?showtrackcount=true&skip=0&limit=10&languagecode=en&style=`,
  );
  const featuredPlaylistId = findString(featuredPlaylists, ["ID", "PlaylistID"]);
  if (featuredPlaylistId) {
    await call("getfeaturedplaylistandtracks documented JSON", `/getfeaturedplaylistandtracks/${guestToken}/${featuredPlaylistId}`, {
      ReturnTracks: true,
      ReturnAlbums: true,
      ReturnLibraries: true,
      AllowInactive: false,
      LanguageCode: "EN",
      OrderBy: "",
    });
    await call(
      "getfeaturedplaylistandtracks Parigo empty JSON body",
      `/getfeaturedplaylistandtracks/${guestToken}/${featuredPlaylistId}`,
      {},
    );
    await call("searchfeaturedplaylisttracks documented JSON", `/searchfeaturedplaylisttracks/${guestToken}/${featuredPlaylistId}`, {
      Keyword: "",
      Fields: "TrackDisplayTitle,TrackDescription",
      ReturnTrackCount: true,
      Skip: 0,
      Limit: 10,
      OrderBy: "Custom_Asc",
    });
  }
  await call("autocomplete documented JSON subset", `/autocomplete/${guestToken}`, {
    Keyword: "piano",
    Wildcard: true,
    ReturnTracks: true,
    ReturnTracks_MainOnly: true,
    ReturnTracks_Fields: "DisplayTitle,Keywords,AlternateTitle",
    ReturnTracks_Limit: 3,
    ReturnTracks_Order: "",
    ReturnTracks_DisableKeywordGroup: true,
    ReturnAlbums: true,
    ReturnAlbums_Fields: "CdCode,DisplayTitle,Description,Keywords",
    ReturnAlbums_Limit: 3,
    ReturnLibraries: true,
    ReturnLibraries_Fields: "Name,Prefix,Description",
    ReturnLibraries_Limit: 3,
    ReturnStyles: true,
    ReturnStyles_Limit: 3,
    ReturnRightHolders: true,
    ReturnRightHolders_Fields: "firstname, lastname",
    ReturnRightHolders_Limit: 3,
    RightHolderTypes: "Artist",
  });

  const login = await call("getmembertoken", `/getmembertoken/${serviceToken}`, {
    UserName: required("HARVEST_TEST_MEMBER_EMAIL"),
    Password: required("HARVEST_TEST_MEMBER_PASSWORD"),
    PersistentLogin: true,
    ReturnMemberDetails: true,
  });
  const memberToken = findString(record(login)?.MemberToken, ["Value", "Token"]);
  const persistentToken = findString(record(login)?.PersistentLoginToken, ["Value", "Token"]);
  if (!memberToken) throw new Error("Member token missing");
  await call("getservicetokeninfo member", `/getservicetokeninfo/${memberToken}`);
  if (persistentToken) {
    await call("validatepersistentlogintoken documented JSON", `/validatepersistentlogintoken/${serviceToken}`, {
      Token: persistentToken,
      RenewExpiry: true,
      GenerateMemberToken: true,
      ReturnMemberDetails: false,
    });
  }
  await call("getmember", `/getmember/${memberToken}`);
  await call(
    "getmemberplaylistcategories",
    `/getmemberplaylistcategories/${memberToken}?returnplaylistcount=true&skip=0&limit=100&sort=Custom_Asc`,
  );
  await call(
    "getmemberplaylistcategoriesandplaylists",
    `/getmemberplaylistcategoriesandplaylists/${memberToken}?returnplaylistcount=true&returntrackcount=true&returnrootobjectsonly=false&returnautosaveonly=false&returnfirstautosave=false&returnhighlightonly=false&playlistcategoryid=&skip=0&limit=100&sort=Custom_Asc`,
  );
  const memberPlaylists = await call(
    "getmemberplaylistsnotracks",
    `/getmemberplaylistsnotracks/${memberToken}?Skip=0&Limit=100`,
  );
  await call("getmemberplaylists", `/getmemberplaylists/${memberToken}?Skip=0&Limit=20`);
  const memberPlaylistId = findString(memberPlaylists, ["ID", "PlaylistID"]);
  if (memberPlaylistId) {
    await call(
      "getmemberplaylist",
      `/getmemberplaylist/${memberToken}/${memberPlaylistId}?returntracks=true&returnpublishlocations=false`,
    );
    await call(
      "getmemberplaylistshares",
      `/getmemberplaylistshares/${memberToken}/${memberPlaylistId}?skip=0&limit=20&sort=Created_Desc`,
    );
    await call(
      "getmemberplaylistsearches",
      `/getmemberplaylistsearches/${memberToken}/${memberPlaylistId}?skip=0&limit=20&sort=CreateDate_Desc`,
    );
    await call("getmemberplaylistschedule", `/getmemberplaylistschedule/${memberToken}/${memberPlaylistId}`);
    await call(
      "getmemberplaylistschedulerun",
      `/getmemberplaylistschedulerun/${memberToken}/${memberPlaylistId}?skip=0&limit=20`,
    );
    await call("searchmemberplaylisttracks minimal", `/searchmemberplaylisttracks/${memberToken}/${memberPlaylistId}`, {
      Keyword: "",
      Fields: "TrackDisplayTitle,TrackDescription",
      ReturnTrackCount: true,
      Skip: 0,
      Limit: 10,
      OrderBy: "Custom_Asc",
    });
  }
  await call("getfavourites", `/getfavourites/${memberToken}?Skip=0&Limit=20&Sort=Created_Desc`);
  await call(
    "gethistorybymembertoken",
    `/gethistorybymembertoken/${memberToken}?startdate=2025-01-01&enddate=2026-12-31&skip=0&limit=20`,
  );
  await call(
    "getdownloadhistorybymembertoken",
    `/getdownloadhistorybymembertoken/${memberToken}?startdate=2025-01-01&enddate=2026-12-31&skip=0&limit=20`,
  );
  await call("gethistorybycommunications", `/gethistorybycommunications/${memberToken}`, {
    Skip: 0,
    Limit: 20,
    Sort: "Created_Desc",
  });
  const tags = await call(
    "getmembertags",
    `/getmembertags/${memberToken}?Skip=0&Limit=100&Sort=Created_Desc&ReturnTagCount=1`,
  );
  const tagId = findString(tags, ["TagID", "ID"]);
  if (tagId) {
    await call(
      "getmembertagtracks",
      `/getmembertagtracks/${memberToken}/${tagId}?Skip=0&Limit=20&Sort=Created_Desc`,
    );
  }
  await call("getmembertagsbytrack", `/getmembertagsbytrack/${memberToken}/${trackId}`);
  await call(
    "gettrackmembercomments",
    `/gettrackmembercomments/${memberToken}/${trackId}?includeadmin=false`,
  );
  await call("searchmembersavesearches", `/searchmembersavesearches/${memberToken}`, {
    Keywords: "",
    Skip: 0,
    Limit: 100,
    Sort: "Created_Desc",
  });

  const report = {
    generatedAt: new Date().toISOString(),
    endpointChecks: results.length,
    transportErrors: results.filter((row) => row.transportError).length,
    logicalErrors: results.filter((row) => row.logicalError).length,
    results,
    serviceCapabilities: {
      similarityProviders: Array.isArray(record(serviceInfo)?.SearchSimilarInfo)
        ? (record(serviceInfo)?.SearchSimilarInfo as unknown[]).length
        : null,
    },
  };
  await writeFile(new URL("../last-public-read-run.json", import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ summary: report }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
