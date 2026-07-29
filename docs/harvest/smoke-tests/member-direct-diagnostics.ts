import { buildCloudSearch } from "../../../src/lib/harvest/search";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : undefined;
}

function findObject(value: unknown, key: string): JsonRecord | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findObject(item, key);
      if (found) return found;
    }
    return undefined;
  }
  const object = record(value);
  if (!object) return undefined;
  for (const [candidate, nested] of Object.entries(object)) {
    if (candidate.toLowerCase() === key.toLowerCase() && record(nested)) return record(nested);
  }
  for (const nested of Object.values(object)) {
    const found = findObject(nested, key);
    if (found) return found;
  }
  return undefined;
}

function findString(value: unknown, keys: string[]): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findString(item, keys);
      if (found) return found;
    }
    return undefined;
  }
  const object = record(value);
  if (!object) return undefined;
  for (const [key, nested] of Object.entries(object)) {
    if (keys.some((candidate) => candidate.toLowerCase() === key.toLowerCase()) &&
        (typeof nested === "string" || typeof nested === "number") && String(nested)) {
      return String(nested);
    }
  }
  for (const nested of Object.values(object)) {
    const found = findString(nested, keys);
    if (found) return found;
  }
  return undefined;
}

function list(value: unknown, key: string): JsonRecord[] {
  const candidate = record(value)?.[key];
  return Array.isArray(candidate) ? candidate.filter((item): item is JsonRecord => Boolean(record(item))) : [];
}

function containsId(value: unknown, id: string): boolean {
  if (Array.isArray(value)) return value.some((item) => containsId(item, id));
  const object = record(value);
  if (!object) return false;
  return Object.entries(object).some(([key, nested]) =>
    (["id", "trackid"].includes(key.toLowerCase()) && String(nested) === id) ||
    containsId(nested, id),
  );
}

function summary(status: number, payload: unknown) {
  const object = record(payload);
  const rawError = object?.Error ?? object?.error;
  const error = record(rawError) || (typeof rawError === "string" ? { Description: rawError } : undefined);
  return {
    status,
    topKeys: object ? Object.keys(object).sort() : [],
    errorCode: error?.Code == null ? null : String(error.Code),
    errorDescription: typeof (error?.Description || error?.Message || error?.message) === "string"
      ? String(error?.Description || error?.Message || error?.message)
      : null,
    arrays: object
      ? Object.fromEntries(Object.entries(object)
        .filter(([, value]) => Array.isArray(value))
        .map(([key, value]) => [key, (value as unknown[]).length]))
      : {},
  };
}

function temporalFacts(value: unknown, path = "root"): Array<{ path: string; value: string | number }> {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => temporalFacts(item, `${path}[${index}]`));
  }
  const object = record(value);
  if (!object) return [];
  return Object.entries(object).flatMap(([key, nested]) => {
    const nestedPath = `${path}.${key}`;
    const own = /(date|time|utcoffset|expiry)/i.test(key) &&
      (typeof nested === "string" || typeof nested === "number")
      ? [{ path: nestedPath, value: nested }]
      : [];
    return [...own, ...temporalFacts(nested, nestedPath)];
  });
}

function playlistTrackIds(value: unknown): string[] {
  const playlist = list(value, "Playlists")[0];
  return list(playlist, "Tracks")
    .map((item) => findString(item, ["ID", "TrackID"]) || "")
    .filter(Boolean);
}

function searchFacts(value: unknown) {
  const source = record(value) || {};
  const tracks = list(source, "Tracks");
  return {
    totalTracks: Number(source.TotalTracks ?? source.TracksFound ?? tracks.length),
    totalAlbums: Number(source.TotalAlbums ?? source.AlbumsFound ?? 0),
    examples: tracks
      .map((item) => findString(item, ["DisplayTitle", "Name", "Title"]) || "")
      .filter(Boolean)
      .slice(0, 5),
  };
}

function assetTemplateFacts(value: unknown) {
  const source = String(value || "");
  const safeUrl = source.replace(/\{[^}]+\}/g, "placeholder");
  let url: URL | undefined;
  try {
    url = new URL(safeUrl);
  } catch {
    url = undefined;
  }
  return {
    present: Boolean(source),
    host: url?.host || null,
    path: url?.pathname || null,
    placeholders: [...source.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort(),
    queryKeys: url ? [...url.searchParams.keys()].sort() : [],
  };
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function main() {
  if (process.env.HARVEST_MEMBER_DIAGNOSTICS !== "1") {
    console.log("Harvest direct diagnostics skipped.");
    return;
  }
  const authUrl = process.env.HARVEST_AUTH_URL || "https://auth.harvestmedia.net/oauth2/token";
  const serviceUrl = process.env.HARVEST_SERVICE_URL || "https://service.harvestmedia.net/HMP-WS.svc";
  const baseUrl = process.env.PARIGO_AUDIT_BASE_URL || "http://127.0.0.1:3000";
  const runId = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const prefix = `Parigo direct audit ${runId}`;

  const oauthResponse = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: required("HARVEST_CLIENT_ID"),
      client_secret: required("HARVEST_CLIENT_SECRET"),
    }),
  });
  const oauth = await oauthResponse.json();
  const accessToken = findString(oauth, ["access_token"]);
  if (!accessToken) throw new Error("OAuth token missing");
  const headers = { Accept: "application/json", Authorization: accessToken };

  async function direct(path: string, init: RequestInit = {}) {
    const response = await fetch(`${serviceUrl}${path}`, {
      ...init,
      headers: {
        ...headers,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
    const payload = await response.json().catch(() => ({}));
    return { status: response.status, payload, date: response.headers.get("date") };
  }
  const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

  const service = await direct("/getservicetoken", { headers: { AccessKey: required("HARVEST_ACCESS_KEY") } });
  const serviceToken = findString(service.payload, ["Token", "Value"]);
  if (!serviceToken) throw new Error("Service token missing");
  const login = await direct(`/getmembertoken/${serviceToken}`, post({
    UserName: required("HARVEST_TEST_MEMBER_EMAIL"),
    Password: required("HARVEST_TEST_MEMBER_PASSWORD"),
    PersistentLogin: true,
    ReturnMemberDetails: true,
  }));
  const memberToken = findString(findObject(login.payload, "MemberToken"), ["Value"]);
  if (!memberToken) throw new Error("Member token missing");
  const serviceInfo = await direct(`/getserviceinfo/${serviceToken}`);
  const serviceTrackStream = findString(findObject(serviceInfo.payload, "ServiceInfoURLs"), ["TrackStreamURL"]) || "";
  const memberTrackStream = findString(findObject(findObject(login.payload, "MemberAccount"), "ServiceInfoURLs"), ["TrackStreamURL"]) || "";
  const serviceTemplateUrl = serviceTrackStream ? new URL(serviceTrackStream.replace(/\{[^}]+\}/g, "placeholder")) : null;
  const memberTemplateUrl = memberTrackStream ? new URL(memberTrackStream.replace(/\{[^}]+\}/g, "placeholder")) : null;
  const templateQueryKeys = [...new Set([
    ...(serviceTemplateUrl ? [...serviceTemplateUrl.searchParams.keys()] : []),
    ...(memberTemplateUrl ? [...memberTemplateUrl.searchParams.keys()] : []),
  ])];
  console.log(JSON.stringify({
    endpoint: "TrackStreamURL service/member contract",
    service: assetTemplateFacts(serviceTrackStream),
    member: assetTemplateFacts(memberTrackStream),
    identical: serviceTrackStream === memberTrackStream,
    pathSame: serviceTemplateUrl?.pathname === memberTemplateUrl?.pathname,
    differingQueryKeys: templateQueryKeys
      .filter((key) => serviceTemplateUrl?.searchParams.get(key) !== memberTemplateUrl?.searchParams.get(key))
      .sort(),
  }));

  const search = await (await fetch(`${baseUrl}/api/search?q=piano&limit=5`)).json();
  const searchItems = record(record(search)?.data)?.items;
  const trackIds = Array.isArray(searchItems)
    ? searchItems.map((item) => findString(item, ["id", "ID"]) || "").filter(Boolean).slice(0, 3)
    : [];
  const trackId = trackIds[0];
  const featured = await (await fetch(`${baseUrl}/api/playlists?limit=1`)).json();
  const featuredItems = record(record(featured)?.data)?.playlists;
  const featuredId = Array.isArray(featuredItems) ? findString(featuredItems[0], ["id", "ID"]) : undefined;
  const formats = await (await fetch(`${baseUrl}/api/download-formats`)).json();
  const formatItems = record(record(formats)?.data)?.formats;
  const formatId = Array.isArray(formatItems) ? findString(formatItems[0], ["id", "ID"]) : undefined;
  if (trackIds.length < 3 || !trackId || !featuredId || !formatId) throw new Error("Public test fixtures missing");

  console.log(JSON.stringify({
    endpoint: "getmembertoken temporal contract",
    response: summary(login.status, login.payload),
    httpDate: login.date,
    temporalFacts: temporalFacts(login.payload).slice(0, 20),
  }));
  const documentedDownloadValidation = await direct(
    `/validatemusicdownloadrequest/${memberToken}`,
    post({
      Identifier: trackId,
      ContentIDs: "",
      DownloadType: "track",
      Format: [formatId],
      TrimEndSecs: 0,
      TrimStartSecs: 0,
      IncludeVersionCheck: false,
    }),
  );
  console.log(JSON.stringify({
    endpoint: "validatemusicdownloadrequest executable JSON example",
    response: summary(documentedDownloadValidation.status, documentedDownloadValidation.payload),
  }));

  const regionId = findString(login.payload, ["RegionID"]);
  for (const keyword of ["mariage", "wedding"]) {
    for (const textScope of ["title", "aggregate"] as const) {
      const body = buildCloudSearch({
        query: keyword,
        view: "Track",
        textScope,
        limit: 10,
        type: "main",
        language: "fr",
        regionId,
        saveSearchHistory: false,
      });
      const response = await direct(`/cloudsearch/${memberToken}`, post(body));
      console.log(JSON.stringify({
        endpoint: "cloudsearch multilingual diagnostic",
        keyword,
        textScope,
        requestContract: "Parigo builder using documented cloudsearch field names",
        translateKeyword: record(record(body.SearchFilters)?.TranslateKeyword) || record(body.SearchFilters)?.TranslateKeyword,
        response: summary(response.status, response.payload),
        httpDate: response.date,
        ...searchFacts(response.payload),
      }));
    }
  }

  const titleSeedBody = buildCloudSearch({
    query: "piano",
    view: "Track",
    textScope: "title",
    limit: 20,
    type: "main",
    language: "fr",
    regionId,
    saveSearchHistory: false,
  });
  const titleSeed = await direct(`/cloudsearch/${memberToken}`, post(titleSeedBody));
  const seedTitle = searchFacts(titleSeed.payload).examples[0] || "Piano";
  const titleQueries = [
    { label: "single-word", value: "Piano" },
    { label: "full-title", value: seedTitle },
  ];
  for (const query of titleQueries) {
    for (const exactPhrase of [false, true]) {
      for (const wildcard of [false, true]) {
        const body = buildCloudSearch({
          query: query.value,
          view: "Track",
          textScope: "title",
          limit: 20,
          type: "main",
          language: "fr",
          regionId,
          saveSearchHistory: false,
        });
        const filters = record(body.SearchFilters);
        const bundle = record(filters?.SearchTermBundle);
        const term = record(bundle?.St_Keyword);
        if (term) {
          term.ExactPhrase = exactPhrase;
          term.Wildcard = wildcard;
        }
        const response = await direct(`/cloudsearch/${memberToken}`, post(body));
        const facts = searchFacts(response.payload);
        console.log(JSON.stringify({
          endpoint: "cloudsearch title match diagnostic",
          queryLabel: query.label,
          query: query.value,
          exactPhrase,
          wildcard,
          response: summary(response.status, response.payload),
          total: facts.totalTracks,
          examples: facts.examples,
          allExamplesStartWithQuery: facts.examples.every((title) =>
            title.toLocaleLowerCase().startsWith(query.value.toLocaleLowerCase())),
          allExamplesEqualQuery: facts.examples.every((title) =>
            title.localeCompare(query.value, undefined, { sensitivity: "base" }) === 0),
        }));
      }
    }
  }

  for (const path of [
    "/api/search?q=mariage&view=tracks&page=1&limit=10&type=main&sort=relevance&language=fr&translate=0",
    "/api/search?q=wedding&view=tracks&page=1&limit=10&type=main&sort=relevance&language=fr&translate=0",
    "/api/search?q=mariage&brief=mariage&resolve=1&view=tracks&page=1&limit=10&type=main&sort=relevance&language=fr&translate=0",
  ]) {
    const response = await fetch(`${baseUrl}${path}`);
    const payload = await response.json().catch(() => ({}));
    console.log(JSON.stringify({
      endpoint: "Parigo search multilingual diagnostic",
      path,
      response: summary(response.status, payload),
      httpDate: response.headers.get("date"),
      total: Number(record(payload)?.meta && record(record(payload)?.meta)?.total || 0),
      intentResolution: record(record(payload)?.meta)?.intentResolution || null,
      queryResolution: record(record(payload)?.meta)?.queryResolution || null,
    }));
  }

  const before = await direct(`/getmemberplaylistsnotracks/${memberToken}?Skip=0&Limit=500`);
  const beforeIds = new Set(list(before.payload, "Playlists").map((item) => findString(item, ["ID"]) || ""));
  const emptyCreate = await direct(`/addmemberplaylist/${memberToken}`, post({
    Name: `${prefix} empty`,
    Description: "Direct contract audit",
    IsPublic: false,
    PlaylistCategoryID: "",
  }));
  const afterEmpty = await direct(`/getmemberplaylistsnotracks/${memberToken}?Skip=0&Limit=500`);
  const emptyResource = list(afterEmpty.payload, "Playlists").find((item) =>
    String(item.Name || "").startsWith(prefix) && !beforeIds.has(String(item.ID || "")));
  console.log(JSON.stringify({
    endpoint: "addmemberplaylist",
    response: summary(emptyCreate.status, emptyCreate.payload),
    resourcePersisted: Boolean(emptyResource),
  }));
  if (emptyResource) {
    await direct(`/removeplaylist/${memberToken}/${encodeURIComponent(String(emptyResource.ID))}`);
  }

  const documentedCreate = await direct(`/addmemberplaylist/${memberToken}`, post({
    requestaddupdateplaylist: {
      playlistname: `${prefix} documented`,
      playlistdescription: "Documented Harvest contract",
      playlisttags: "parigo-audit",
      highlighttracks: false,
      autosave: false,
      autosavelimit: 0,
      autosaveapplytohighlighttracks: false,
      playlistcategoryid: "",
      externalplaylistimageurl: "",
      orderby: "Custom_ASC",
    },
  }));
  const playlistOffsets = [0, 250, 1_000, 3_000, 10_000, 30_000, 60_000];
  const playlistObservations: Array<{ delayMs: number; present: boolean }> = [];
  let documentedResource: JsonRecord | undefined;
  for (let index = 0; index < playlistOffsets.length; index += 1) {
    const delayMs = playlistOffsets[index];
    const previous = index === 0 ? 0 : playlistOffsets[index - 1];
    if (delayMs > previous) await new Promise((resolve) => setTimeout(resolve, delayMs - previous));
    const afterDocumentedCreate = await direct(`/getmemberplaylistsnotracks/${memberToken}?Skip=0&Limit=500`);
    documentedResource = list(afterDocumentedCreate.payload, "Playlists").find((item) =>
      String(item.Name || "") === `${prefix} documented` && !beforeIds.has(String(item.ID || "")));
    playlistObservations.push({ delayMs, present: Boolean(documentedResource) });
    if (documentedResource) break;
  }
  const documentedPlaylistId = documentedResource ? String(documentedResource.ID || "") : "";
  console.log(JSON.stringify({
    endpoint: "addmemberplaylist documented payload",
    response: summary(documentedCreate.status, documentedCreate.payload),
    httpDate: documentedCreate.date,
    resourcePersisted: Boolean(documentedPlaylistId),
    observations: playlistObservations,
    temporalFacts: temporalFacts(documentedCreate.payload).slice(0, 10),
  }));

  if (documentedPlaylistId) {
    try {
      const documentedUpdate = await direct(
        `/updateplaylist/${memberToken}/${encodeURIComponent(documentedPlaylistId)}`,
        post({
          PlaylistName: `${prefix} documented renamed`,
          PlaylistDescription: "Documented Harvest update contract",
        }),
      );
      const afterDocumentedUpdate = await direct(
        `/getmemberplaylist/${memberToken}/${encodeURIComponent(documentedPlaylistId)}?returntracks=true&returnpublishlocations=false`,
      );
      console.log(JSON.stringify({
        endpoint: "updateplaylist documented payload",
        response: summary(documentedUpdate.status, documentedUpdate.payload),
        persisted: JSON.stringify(afterDocumentedUpdate.payload).includes(`${prefix} documented renamed`),
        temporalFacts: temporalFacts(afterDocumentedUpdate.payload).slice(0, 10),
      }));

      const documentedAdd = await direct(`/addtomemberplaylists/${memberToken}`, post({
        ObjectType: "Track",
        ObjectIDs: trackIds,
        AddToPlaylistIDs: [documentedPlaylistId],
        ObjectTrimStart: null,
        ObjectTrimEnd: null,
        AddToAutoSavePlaylists: false,
      }));
      const afterDocumentedAdd = await direct(
        `/getmemberplaylist/${memberToken}/${encodeURIComponent(documentedPlaylistId)}?returntracks=true&returnpublishlocations=false`,
      );
      const addedTrackIds = playlistTrackIds(afterDocumentedAdd.payload);
      console.log(JSON.stringify({
        endpoint: "addtomemberplaylists documented payload",
        response: summary(documentedAdd.status, documentedAdd.payload),
        expectedTrackIds: trackIds,
        actualTrackIds: addedTrackIds,
        persisted: trackIds.every((id) => addedTrackIds.includes(id)),
      }));

      const documentedDuplicate = await direct(`/addtomemberplaylists/${memberToken}`, post({
        ObjectType: "Track",
        ObjectIDs: [trackId],
        AddToPlaylistIDs: [documentedPlaylistId],
        ObjectTrimStart: null,
        ObjectTrimEnd: null,
        AddToAutoSavePlaylists: false,
      }));
      const afterDuplicate = await direct(
        `/getmemberplaylist/${memberToken}/${encodeURIComponent(documentedPlaylistId)}?returntracks=true&returnpublishlocations=false`,
      );
      const duplicateIds = playlistTrackIds(afterDuplicate.payload);
      console.log(JSON.stringify({
        endpoint: "addtomemberplaylists documented duplicate",
        response: summary(documentedDuplicate.status, documentedDuplicate.payload),
        occurrences: duplicateIds.filter((id) => id === trackId).length,
      }));

      const documentedReorder = await direct(`/reordermemberplaylisttracks/${memberToken}`, post({
        FromPlaylistID: documentedPlaylistId,
        ToPlaylistID: documentedPlaylistId,
        TrackIDs: trackIds[2],
        SucceedingTrackID: trackIds[0],
        Copy: false,
      }));
      const afterReorder = await direct(
        `/getmemberplaylist/${memberToken}/${encodeURIComponent(documentedPlaylistId)}?returntracks=true&returnpublishlocations=false`,
      );
      console.log(JSON.stringify({
        endpoint: "reordermemberplaylisttracks documented payload",
        response: summary(documentedReorder.status, documentedReorder.payload),
        actualTrackIds: playlistTrackIds(afterReorder.payload),
      }));

      const remove = await direct(
        `/removeplaylisttracks/${memberToken}/${encodeURIComponent(documentedPlaylistId)}`,
        post({ track: [{ id: trackId }] }),
      );
      const afterRemove = await direct(
        `/getmemberplaylist/${memberToken}/${encodeURIComponent(documentedPlaylistId)}?returntracks=true&returnpublishlocations=false`,
      );
      console.log(JSON.stringify({
        endpoint: "removeplaylisttracks documented example payload",
        response: summary(remove.status, remove.payload),
        absentAfter: !containsId(afterRemove.payload, trackId),
      }));

      const suggest = await direct(`/suggestmemberplaylisttracks/${memberToken}/${encodeURIComponent(documentedPlaylistId)}`, post({
        Skip: 0,
        Limit: 5,
        MainOnly: true,
        SeedDetermination: "Created_Desc",
        SeedLimit: 5,
        SeedMin: "",
      }));
      console.log(JSON.stringify({
        endpoint: "suggestmemberplaylisttracks",
        response: summary(suggest.status, suggest.payload),
      }));
    } finally {
      const cleanup = await direct(`/removeplaylist/${memberToken}/${encodeURIComponent(documentedPlaylistId)}`);
      const verify = await direct(`/getmemberplaylistsnotracks/${memberToken}?Skip=0&Limit=500`);
      console.log(JSON.stringify({
        endpoint: "removeplaylist documented cleanup",
        response: summary(cleanup.status, cleanup.payload),
        cleaned: !containsId(verify.payload, documentedPlaylistId),
      }));
    }
  }

  for (const copyVariant of [
    {
      name: "current",
      body: { PlaylistID: featuredId, FeaturedPlaylistID: featuredId },
    },
    {
      name: "documented",
      body: { PlaylistID: featuredId, PlaylistName: `${prefix} copied`, CopyTracks: true },
    },
  ]) {
    const beforeCopy = await direct(`/getmemberplaylistsnotracks/${memberToken}?Skip=0&Limit=500`);
    const beforeCopyIds = new Set(list(beforeCopy.payload, "Playlists").map((item) => String(item.ID || "")));
    const copy = await direct(`/copytomemberplaylist/${memberToken}`, post(copyVariant.body));
    const afterCopy = await direct(`/getmemberplaylistsnotracks/${memberToken}?Skip=0&Limit=500`);
    const copyObject = list(afterCopy.payload, "Playlists").find((item) => !beforeCopyIds.has(String(item.ID || "")));
    const copyId = copyObject ? String(copyObject.ID || "") : "";
    let copiedTrackIds: string[] = [];
    if (copyId) {
      const detail = await direct(
        `/getmemberplaylist/${memberToken}/${encodeURIComponent(copyId)}?returntracks=true&returnpublishlocations=false`,
      );
      copiedTrackIds = playlistTrackIds(detail.payload);
      if (copyVariant.name === "documented") {
        const documentedUpdate = await direct(
          `/updateplaylist/${memberToken}/${encodeURIComponent(copyId)}`,
          post({
            PlaylistName: `${prefix} copied renamed`,
            PlaylistDescription: "Documented update on a copied playlist",
          }),
        );
        const afterDocumentedUpdate = await direct(
          `/getmemberplaylist/${memberToken}/${encodeURIComponent(copyId)}?returntracks=true&returnpublishlocations=false`,
        );
        console.log(JSON.stringify({
          endpoint: "updateplaylist documented payload on copy",
          response: summary(documentedUpdate.status, documentedUpdate.payload),
          persisted: JSON.stringify(afterDocumentedUpdate.payload).includes(`${prefix} copied renamed`),
          temporalFacts: temporalFacts(afterDocumentedUpdate.payload).slice(0, 10),
        }));

        const trackToAdd = trackIds.find((id) => !copiedTrackIds.includes(id));
        if (trackToAdd) {
          const documentedAdd = await direct(`/addtomemberplaylists/${memberToken}`, post({
            ObjectType: "Track",
            ObjectIDs: [trackToAdd],
            AddToPlaylistIDs: [copyId],
          }));
          const afterDocumentedAdd = await direct(
            `/getmemberplaylist/${memberToken}/${encodeURIComponent(copyId)}?returntracks=true&returnpublishlocations=false`,
          );
          const afterAddIds = playlistTrackIds(afterDocumentedAdd.payload);
          console.log(JSON.stringify({
            endpoint: "addtomemberplaylists documented payload on copy",
            response: summary(documentedAdd.status, documentedAdd.payload),
            trackId: trackToAdd,
            persisted: afterAddIds.includes(trackToAdd),
          }));

          const duplicateAdd = await direct(`/addtomemberplaylists/${memberToken}`, post({
            ObjectType: "Track",
            ObjectIDs: [trackToAdd],
            AddToPlaylistIDs: [copyId],
          }));
          const afterDuplicate = await direct(
            `/getmemberplaylist/${memberToken}/${encodeURIComponent(copyId)}?returntracks=true&returnpublishlocations=false`,
          );
          const duplicateIds = playlistTrackIds(afterDuplicate.payload);
          console.log(JSON.stringify({
            endpoint: "addtomemberplaylists documented duplicate on copy",
            response: summary(duplicateAdd.status, duplicateAdd.payload),
            occurrences: duplicateIds.filter((id) => id === trackToAdd).length,
          }));

          const remove = await direct(`/removeplaylisttracks/${memberToken}/${encodeURIComponent(copyId)}`, post({
            TrackIDs: [trackToAdd],
            Tracks: [{ ID: trackToAdd }],
          }));
          const afterRemove = await direct(
            `/getmemberplaylist/${memberToken}/${encodeURIComponent(copyId)}?returntracks=true&returnpublishlocations=false`,
          );
          console.log(JSON.stringify({
            endpoint: "removeplaylisttracks current undocumented payload on copy",
            response: summary(remove.status, remove.payload),
            absentAfter: !playlistTrackIds(afterRemove.payload).includes(trackToAdd),
          }));
        }

        if (copiedTrackIds.length >= 3) {
          const reorder = await direct(`/reordermemberplaylisttracks/${memberToken}`, post({
            FromPlaylistID: copyId,
            ToPlaylistID: copyId,
            TrackIDs: copiedTrackIds[2],
            SucceedingTrackID: copiedTrackIds[0],
            Copy: false,
          }));
          const afterReorder = await direct(
            `/getmemberplaylist/${memberToken}/${encodeURIComponent(copyId)}?returntracks=true&returnpublishlocations=false`,
          );
          console.log(JSON.stringify({
            endpoint: "reordermemberplaylisttracks documented payload on copy",
            response: summary(reorder.status, reorder.payload),
            beforeFirstThree: copiedTrackIds.slice(0, 3),
            afterFirstThree: playlistTrackIds(afterReorder.payload).slice(0, 3),
          }));
        }

        const suggest = await direct(`/suggestmemberplaylisttracks/${memberToken}/${encodeURIComponent(copyId)}`, post({
          Skip: 0,
          Limit: 5,
          MainOnly: true,
          SeedDetermination: "Created_Desc",
          SeedLimit: 5,
          SeedMin: "",
        }));
        console.log(JSON.stringify({
          endpoint: "suggestmemberplaylisttracks documented payload on copy",
          response: summary(suggest.status, suggest.payload),
        }));
      }
    }
    console.log(JSON.stringify({
      endpoint: `copytomemberplaylist ${copyVariant.name} payload`,
      response: summary(copy.status, copy.payload),
      copyIdentified: Boolean(copyId),
      copiedTrackCount: copiedTrackIds.length,
    }));
    if (copyId) {
      const cleanup = await direct(`/removeplaylist/${memberToken}/${encodeURIComponent(copyId)}`);
      const verify = await direct(`/getmemberplaylistsnotracks/${memberToken}?Skip=0&Limit=500`);
      console.log(JSON.stringify({
        endpoint: `copytomemberplaylist ${copyVariant.name} cleanup`,
        response: summary(cleanup.status, cleanup.payload),
        cleaned: !containsId(verify.payload, copyId),
      }));
    }
  }

  const note = await direct(`/addtrackmembercomment/${memberToken}`, post({
    TrackID: trackId,
    TagName: `${prefix} note`,
  }));
  const notes = await direct(`/gettrackmembercomments/${memberToken}/${encodeURIComponent(trackId)}?includeadmin=false`);
  const noteObjects = list(notes.payload, "Tags").filter((item) =>
    String(item.tagname || item.TagName || item.Name || "").startsWith(prefix));
  console.log(JSON.stringify({
    endpoint: "addtrackmembercomment",
    response: summary(note.status, note.payload),
    resourcePersisted: noteObjects.length > 0,
  }));
  for (const item of noteObjects) {
    const id = String(item.tagid || item.TagID || item.ID || "");
    if (id) await direct(`/removetrackmembercomment/${memberToken}/${encodeURIComponent(id)}`);
  }

  const profile = await direct(`/getmember/${memberToken}`);
  const member = findObject(profile.payload, "MemberAccount") || record(profile.payload);
  const originalSubscribed = Boolean(member?.Subscribe);
  const subscriptionBody = {
    FirstName: member?.FirstName,
    LastName: member?.LastName,
    Email: member?.Email || member?.Username,
  };
  const toggleSubscription = await direct(`/membersubscribe/${memberToken}`, post({
    ...subscriptionBody,
    Subscribe: !originalSubscribed,
  }));
  const toggledProfile = await direct(`/getmember/${memberToken}`);
  const toggledValue = Boolean((findObject(toggledProfile.payload, "MemberAccount") || record(toggledProfile.payload))?.Subscribe);
  const restoreSubscription = await direct(`/membersubscribe/${memberToken}`, post({
    ...subscriptionBody,
    Subscribe: originalSubscribed,
  }));
  const restoredProfile = await direct(`/getmember/${memberToken}`);
  const restoredValue = Boolean((findObject(restoredProfile.payload, "MemberAccount") || record(restoredProfile.payload))?.Subscribe);
  console.log(JSON.stringify({
    endpoint: "membersubscribe",
    toggleResponse: summary(toggleSubscription.status, toggleSubscription.payload),
    restoreResponse: summary(restoreSubscription.status, restoreSubscription.payload),
    toggled: toggledValue === !originalSubscribed,
    restored: restoredValue === originalSubscribed,
  }));

  const validation = await direct(`/validatemusicdownloadrequest/${memberToken}`, post({
    Tracks: [{ ID: trackId }],
    TrackIDs: [trackId],
    Format: formatId,
    FileFormatID: formatId,
    IncludeVersions: false,
  }));
  console.log(JSON.stringify({
    endpoint: "validatemusicdownloadrequest current payload",
    response: summary(validation.status, validation.payload),
  }));

  const documentedValidation = await direct(`/validatemusicdownloadrequest/${memberToken}`, post({
    Identifier: trackId,
    ContentIDs: "",
    DownloadType: "track",
    Format: [formatId],
    TrimEndSecs: 0,
    TrimStartSecs: 0,
    IncludeVersionCheck: false,
  }));
  console.log(JSON.stringify({
    endpoint: "validatemusicdownloadrequest documented payload",
    response: summary(documentedValidation.status, documentedValidation.payload),
  }));

  for (const [variant, cueTrackIds] of [
    ["single-main", [trackId]],
    ["multiple-main", trackIds],
  ] as const) {
    const cueSheet = await direct(
      `/getcuesheet/${memberToken}?filename=${encodeURIComponent(`parigo-direct-${runId}-${variant}`)}`,
      post({ track: cueTrackIds }),
    );
    console.log(JSON.stringify({
      endpoint: "getcuesheet",
      variant,
      trackCount: cueTrackIds.length,
      response: summary(cueSheet.status, cueSheet.payload),
      urlReturned: Boolean(findString(cueSheet.payload, ["FullUrl"])),
    }));
  }

  const savedSearches = await direct(`/searchmembersavesearches/${memberToken}`, post({
    Keywords: "",
    Skip: 0,
    Limit: 100,
    Sort: "Created_Desc",
  }));
  const birthday = list(savedSearches.payload, "SavedSearches").find((item) =>
    String(item.Name || "").trim().toLowerCase() === "birthday");
  console.log(JSON.stringify({
    endpoint: "searchmembersavesearches temporal evidence",
    response: summary(savedSearches.status, savedSearches.payload),
    httpDate: savedSearches.date,
    birthday: birthday
      ? {
          idPresent: Boolean(birthday.ID),
          createdDate: birthday.CreatedDate || null,
          lastUpdateDate: birthday.LastUpdateDate || null,
        }
      : null,
  }));

  const history = await direct(
    `/gethistorybymembertoken/${memberToken}?startdate=2025-01-01&enddate=2026-12-31&skip=0&limit=50`,
  );
  const historyObject = record(history.payload)?.History;
  console.log(JSON.stringify({
    endpoint: "gethistorybymembertoken temporal evidence",
    response: summary(history.status, history.payload),
    httpDate: history.date,
    temporalFacts: temporalFacts(history.payload).slice(0, 80),
    historyTrackIds: list(historyObject, "Tracks")
      .map((item) => findString(item, ["ID"]) || "")
      .filter(Boolean)
      .slice(0, 20),
    historyItems: list(historyObject, "HistoryItems")
      .map((item) => ({
        trackId: findString(item, ["TrackID"]) || null,
        deliveryDate: item.DeliveryDate || null,
        utcOffset: item.UTCOffset || null,
        itemType: item.ItemType || null,
      }))
      .slice(0, 20),
  }));
}

main().catch((error) => {
  console.error(JSON.stringify({ fatal: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
});
