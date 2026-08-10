import { buildCloudSearch } from "../../../src/lib/harvest/search";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : undefined;
}

function list(value: unknown, key: string): JsonRecord[] {
  const sourceRecord = record(value);
  const source = sourceRecord
    ? Object.entries(sourceRecord).find(([candidate]) => candidate.toLowerCase() === key.toLowerCase())?.[1]
    : undefined;
  return Array.isArray(source)
    ? source.filter((item): item is JsonRecord => Boolean(record(item)))
    : [];
}

function collectLists(value: unknown, key: string): JsonRecord[][] {
  const matches: JsonRecord[][] = [];
  const visit = (candidate: unknown) => {
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }
    const source = record(candidate);
    if (!source) return;
    for (const [candidateKey, nested] of Object.entries(source)) {
      if (candidateKey.toLowerCase() === key.toLowerCase() && Array.isArray(nested)) {
        matches.push(nested.filter((item): item is JsonRecord => Boolean(record(item))));
      }
      visit(nested);
    }
  };
  visit(value);
  return matches;
}

function findObject(value: unknown, key: string): JsonRecord | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findObject(item, key);
      if (found) return found;
    }
    return undefined;
  }
  const source = record(value);
  if (!source) return undefined;
  for (const [candidate, nested] of Object.entries(source)) {
    if (candidate.toLowerCase() === key.toLowerCase() && record(nested)) return record(nested);
  }
  for (const nested of Object.values(source)) {
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
  const source = record(value);
  if (!source) return undefined;
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
  return undefined;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function errorSummary(payload: unknown) {
  const error = record(record(payload)?.Error);
  return {
    code: error?.Code == null ? null : String(error.Code),
    description: error?.Description == null ? null : String(error.Description),
  };
}

function searchTitles(payload: unknown): string[] {
  return list(payload, "Tracks")
    .map((track) => findString(track, ["DisplayTitle", "Title", "Name"]) || "")
    .filter(Boolean);
}

function totalTracks(payload: unknown): number {
  const source = record(payload);
  return Number(source?.TotalTracks ?? source?.TracksFound ?? list(payload, "Tracks").length);
}

async function main() {
  if (process.env.HARVEST_OPEN_GAPS_AUDIT !== "1") {
    console.log("Harvest open-gaps audit skipped (set HARVEST_OPEN_GAPS_AUDIT=1 to enable).");
    return;
  }

  const authUrl = process.env.HARVEST_AUTH_URL || "https://auth.harvestmedia.net/oauth2/token";
  const serviceUrl = process.env.HARVEST_SERVICE_URL || "https://service.harvestmedia.net/HMP-WS.svc";
  const accountPrefix = process.env.HARVEST_AUDIT_ACCOUNT === "recipient"
    ? "HARVEST_TEST_RECIPIENT"
    : "HARVEST_TEST_MEMBER";
  const memberEmail = required(`${accountPrefix}_EMAIL`);
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

  const direct = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${serviceUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: accessToken,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
    return { status: response.status, payload: await response.json().catch(() => ({})) };
  };
  const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

  const service = await direct("/getservicetoken", {
    headers: { AccessKey: required("HARVEST_ACCESS_KEY") },
  });
  const serviceToken = findString(service.payload, ["Token", "Value"]);
  if (!serviceToken) throw new Error("Service token missing");
  const login = await direct(`/getmembertoken/${serviceToken}`, post({
    UserName: memberEmail,
    Password: required(`${accountPrefix}_PASSWORD`),
    PersistentLogin: false,
    ReturnMemberDetails: true,
  }));
  const memberToken = findString(findObject(login.payload, "MemberToken"), ["Value"]);
  if (!memberToken) throw new Error("Member token missing");
  const regionId = findString(findObject(login.payload, "MemberAccount"), ["RegionID"]);

  const titleSeed = buildCloudSearch({
    query: "piano",
    view: "Track",
    textScope: "title",
    skip: 0,
    limit: 100,
    language: "fr",
    regionId,
    saveSearchHistory: false,
  });
  const seedResult = await direct(`/cloudsearch/${memberToken}`, post(titleSeed));

  let tagMutationEvidence: JsonRecord | undefined;
  if (process.env.HARVEST_TAG_COUNT_MUTATION_TEST === "1") {
    const track = list(seedResult.payload, "Tracks")[0];
    const trackId = track && findString(track, ["TrackID", "ID"]);
    if (!trackId) throw new Error("Tag-count mutation test could not find a track ID");
    let temporaryTagId = "";
    try {
      const created = await direct(`/addmembertag/${memberToken}`, post({
        TagName: `Parigo tag-count audit ${new Date().toISOString()}`,
      }));
      temporaryTagId = findString(created.payload, ["TagID", "ID"]) || "";
      if (!temporaryTagId) throw new Error("Tag-count mutation test could not create a tag");
      const added = await direct(`/addtomembertags/${memberToken}`, post({
        ObjectType: "Track",
        ObjectIDs: [trackId],
        AddToTagIDs: [temporaryTagId],
      }));

      let actualCount = 0;
      let forwardShape: JsonRecord = {};
      const verificationOffsets = [0, 250, 1_000, 3_000, 10_000, 30_000];
      for (let attempt = 0; attempt < verificationOffsets.length; attempt += 1) {
        const previous = attempt === 0 ? 0 : verificationOffsets[attempt - 1];
        const delay = verificationOffsets[attempt] - previous;
        if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
        const detail = await direct(`/getmembertagtracks/${memberToken}/${encodeURIComponent(temporaryTagId)}?Skip=0&Limit=500&Sort=Alphabetic_Asc`);
        const detailedTag = list(detail.payload, "Tags")[0];
        actualCount = list(detailedTag, "Tracks").length;
        forwardShape = {
          topLevelKeys: Object.keys(record(detail.payload) || {}).sort(),
          tagKeys: Object.keys(detailedTag || {}).sort(),
          tracksCollections: collectLists(detail.payload, "Tracks").map((tracks) => tracks.length),
        };
        if (actualCount > 0) break;
      }
      const tagsByTrack = await direct(`/getmembertagsbytrack/${memberToken}/${encodeURIComponent(trackId)}`);
      const linkedByTrack = list(tagsByTrack.payload, "Tags")
        .some((tag) => String(tag.TagID || tag.ID || "") === temporaryTagId);
      const counted = await direct(`/getmembertags/${memberToken}?Skip=0&Limit=100&Sort=Alphabetic_Asc&ReturnTagCount=1`);
      const temporaryTag = list(counted.payload, "Tags").find((tag) => String(tag.TagID || tag.ID || "") === temporaryTagId);
      const reportedCount = Number(temporaryTag?.TrackCount ?? temporaryTag?.TracksCount ?? 0);
      tagMutationEvidence = {
        created: true,
        addHttpStatus: added.status,
        addError: errorSummary(added.payload),
        associationPersisted: actualCount === 1,
        linkedByTrack,
        reportedCount,
        actualCount,
        countsMatch: reportedCount === actualCount,
        addResponseKeys: Object.keys(record(added.payload) || {}).sort(),
        forwardShape,
      };
    } finally {
      if (temporaryTagId) {
        await direct(`/removemembertag/${memberToken}/${encodeURIComponent(temporaryTagId)}`);
      }
    }
  }

  const rawTags = await direct(`/getmembertags/${memberToken}?Skip=0&Limit=100&Sort=Alphabetic_Asc&ReturnTagCount=1`);
  const tagEvidence = [];
  for (const tag of list(rawTags.payload, "Tags").slice(0, 20)) {
    const tagId = String(tag.TagID || tag.ID || "");
    if (!tagId) continue;
    const detail = await direct(`/getmembertagtracks/${memberToken}/${encodeURIComponent(tagId)}?Skip=0&Limit=500&Sort=Alphabetic_Asc`);
    const detailedTag = list(detail.payload, "Tags")[0];
    const actualCount = list(detailedTag, "Tracks").length;
    const reportedCount = Number(tag.TrackCount ?? tag.TracksCount ?? 0);
    tagEvidence.push({
      tagId,
      reportedCount,
      actualCount,
      responseKeys: Object.keys(record(detail.payload) || {}).sort(),
      tagKeys: Object.keys(detailedTag || {}).sort(),
    });
  }

  const flatPlaylists = await direct(`/getmemberplaylistsnotracks/${memberToken}?Skip=0&Limit=500`);
  const hierarchy = await direct(`/getmemberplaylistcategoriesandplaylists/${memberToken}?returnplaylistcount=true&returntrackcount=true&returnrootobjectsonly=false&returnautosaveonly=false&returnfirstautosave=false&returnhighlightonly=false&playlistcategoryid=&skip=0&limit=500&sort=Custom_Asc`);
  const flatItems = list(flatPlaylists.payload, "Playlists");
  const nestedCategoryByPlaylist = new Map<string, string>();
  const hierarchyPlaylistIds = new Set<string>();
  for (const object of list(hierarchy.payload, "PlaylistObjects")) {
    const categoryId = String(object.PlaylistCategoryID || object.ID || "");
    for (const playlist of list(object, "Playlists")) {
      const playlistId = String(playlist.ID || playlist.PlaylistID || "");
      if (playlistId) hierarchyPlaylistIds.add(playlistId);
      if (playlistId && categoryId) nestedCategoryByPlaylist.set(playlistId, categoryId);
    }
    const rootPlaylistId = String(object.PlaylistID || (String(object.ObjectType || "").toLowerCase() === "playlist" ? object.ID : "") || "");
    if (rootPlaylistId) hierarchyPlaylistIds.add(rootPlaylistId);
  }
  const nestedFlatItems = flatItems.filter((playlist) => nestedCategoryByPlaylist.has(String(playlist.ID || playlist.PlaylistID || "")));
  const missingCategory = nestedFlatItems.filter((playlist) => !playlist.PlaylistCategoryID);

  const savedSearchResponse = await direct(`/searchmembersavesearches/${memberToken}`, post({
    Keywords: "",
    Skip: 0,
    Limit: 100,
    Sort: "Created_Desc",
  }));
  const savedSearches = list(savedSearchResponse.payload, "SavedSearches");
  const savedWithParameters = savedSearches.find((search) => search.SearchParameters != null);
  let replayEvidence: JsonRecord = { attempted: false, reason: "No saved search exposes SearchParameters" };
  if (savedWithParameters) {
    let parameters: unknown = savedWithParameters.SearchParameters;
    if (typeof parameters === "string") {
      try { parameters = JSON.parse(parameters); } catch { /* keep the raw string for structural evidence */ }
    }
    const parsed = record(parameters);
    let replayBody: JsonRecord | undefined;
    if (parsed?.SearchFilters) replayBody = { ...parsed, SaveSearchHistory: false };
    else if (parsed?.SearchType || parsed?.SearchTermBundle) {
      replayBody = { SaveSearchHistory: false, SearchFilters: parsed };
    }
    if (replayBody) {
      const replay = await direct(`/cloudsearch/${memberToken}`, post(replayBody));
      replayEvidence = {
        attempted: true,
        httpStatus: replay.status,
        ...errorSummary(replay.payload),
        totalTracks: totalTracks(replay.payload),
      };
    } else {
      replayEvidence = {
        attempted: false,
        reason: "SearchParameters is not a directly reusable cloudsearch request",
        parameterType: Array.isArray(parameters) ? "array" : typeof parameters,
        parameterKeys: parsed ? Object.keys(parsed).sort() : [],
      };
    }
  }

  const communicationsResponse = await direct(`/gethistorybycommunications/${memberToken}`, post({
    Skip: 0,
    Limit: 100,
    Sort: "Created_Desc",
    StartDate: "",
    EndDate: "",
  }));
  const communicationHistory = findObject(communicationsResponse.payload, "History") || record(communicationsResponse.payload);
  const communicationItems = communicationHistory ? list(communicationHistory, "HistoryItems") : [];

  const fullTitle = searchTitles(seedResult.payload)[0] || "Piano";
  const titleMatchEvidence = [];
  for (const query of ["piano", fullTitle]) {
    for (const [exactPhrase, wildcard] of [[false, false], [false, true], [true, false], [true, true]] as const) {
      const body = buildCloudSearch({
        query,
        view: "Track",
        textScope: "title",
        skip: 0,
        limit: 100,
        language: "fr",
        regionId,
        saveSearchHistory: false,
      });
      const term = record(record(record(body.SearchFilters)?.SearchTermBundle)?.St_Keyword);
      if (term) {
        term.ExactPhrase = exactPhrase;
        term.Wildcard = wildcard;
      }
      const response = await direct(`/cloudsearch/${memberToken}`, post(body));
      const titles = searchTitles(response.payload);
      const normalizedQuery = query.toLocaleLowerCase();
      titleMatchEvidence.push({
        query,
        exactPhrase,
        wildcard,
        total: totalTracks(response.payload),
        returned: titles.length,
        allReturnedStartWithQuery: titles.every((title) => title.toLocaleLowerCase().startsWith(normalizedQuery)),
        allReturnedEqualQuery: titles.every((title) => title.localeCompare(query, undefined, { sensitivity: "base" }) === 0),
        examples: titles.slice(0, 5),
        ...errorSummary(response.payload),
      });
    }
  }

  const result: JsonRecord = {
    tagCounts: {
      httpStatus: rawTags.status,
      inspected: Math.min(list(rawTags.payload, "Tags").length, 20),
      evidence: tagEvidence,
      ...(tagMutationEvidence ? { mutation: tagMutationEvidence } : {}),
    },
    playlistCategory: {
      flatCount: flatItems.length,
      nestedFlatCount: nestedFlatItems.length,
      missingCategoryCount: missingCategory.length,
      hierarchyPlaylistCount: hierarchyPlaylistIds.size,
      flatMissingFromHierarchy: flatItems
        .map((playlist) => String(playlist.ID || playlist.PlaylistID || ""))
        .filter((id) => id && !hierarchyPlaylistIds.has(id)),
      flatKeys: [...new Set(flatItems.flatMap((item) => Object.keys(item)))].sort(),
    },
    savedSearchReplay: {
      count: savedSearches.length,
      savedSearchKeys: [...new Set(savedSearches.flatMap((item) => Object.keys(item)))].sort(),
      ...replayEvidence,
    },
    communications: {
      httpStatus: communicationsResponse.status,
      count: communicationItems.length,
      itemKeys: [...new Set(communicationItems.flatMap((item) => Object.keys(item)))].sort(),
      types: [...new Set(communicationItems.map((item) => String(item.Type || "")).filter(Boolean))].sort(),
      subjects: communicationItems.map((item) => String(item.Subject || "")).filter(Boolean),
      contentLikeKeys: [...new Set(communicationItems.flatMap((item) => Object.keys(item)))]
        .filter((key) => /body|content|message|template/i.test(key))
        .sort(),
    },
    titleMatch: titleMatchEvidence,
  };

  if (process.env.HARVEST_EMAIL_TEMPLATE_PREVIEW === "1" ||
      process.env.HARVEST_CONTACT_SEND_TEST === "1" ||
      process.env.HARVEST_PASSWORD_RESET_SEND_TEST === "1") {
    const timestamp = new Date().toISOString();
    const emailSends: JsonRecord = {};
    if (process.env.HARVEST_EMAIL_TEMPLATE_PREVIEW === "1") {
      const preview = await direct(`/sendsharemusiclinkemail/${memberToken}`, post({
        FromEmail: memberEmail,
        ToEmail: memberEmail,
        Message: `Aperçu temporaire de la direction artistique Parigo — ${timestamp}`,
        Link: "https://parigo-ten.vercel.app/",
        ContentType: "Playlist",
        ContentTitle: "Preview Parigo Design",
        SelectEmailTemplateByMemberRegion: false,
      }));
      emailSends.preview = { httpStatus: preview.status, ...errorSummary(preview.payload) };
    }
    if (process.env.HARVEST_CONTACT_SEND_TEST === "1") {
      const contact = await direct(`/sendcontactusemail/${serviceToken}`, post({
        Name: "Parigo API audit",
        Email: memberEmail,
        PhoneNumber: "",
        Subject: `Parigo contact endpoint retest ${timestamp}`,
        Message: "Automated Parigo audit message after Harvest support configuration review.",
      }));
      emailSends.contact = { httpStatus: contact.status, ...errorSummary(contact.payload) };
    }
    if (process.env.HARVEST_PASSWORD_RESET_SEND_TEST === "1") {
      const reset = await direct(`/sendpasswordresetemail/${serviceToken}`, post({
        Username: "",
        Email: memberEmail,
      }));
      emailSends.passwordReset = { httpStatus: reset.status, ...errorSummary(reset.payload) };
    }
    result.emailSends = emailSends;
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
