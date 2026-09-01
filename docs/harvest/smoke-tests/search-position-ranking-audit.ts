import { buildCloudSearch } from "../../../src/lib/harvest/search";

type JsonRecord = Record<string, unknown>;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

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
  for (const [candidate, nested] of Object.entries(source)) {
    if (keys.some((key) => key.toLowerCase() === candidate.toLowerCase()) &&
        (typeof nested === "string" || typeof nested === "number")) {
      return String(nested);
    }
  }
  for (const nested of Object.values(source)) {
    const found = findString(nested, keys);
    if (found) return found;
  }
  return "";
}

function list(value: unknown, key: string): JsonRecord[] {
  const source = record(value);
  const candidate = source && Object.entries(source)
    .find(([name]) => name.toLowerCase() === key.toLowerCase())?.[1];
  return Array.isArray(candidate)
    ? candidate.filter((item): item is JsonRecord => Boolean(record(item)))
    : [];
}

function total(payload: unknown, view: "Track" | "Album") {
  const source = record(payload);
  return Number(source?.[view === "Track" ? "TotalTracks" : "TotalAlbums"] || 0);
}

function term(body: JsonRecord) {
  return record(record(record(body.SearchFilters)?.SearchTermBundle)?.St_Keyword);
}

function summarizeTitles(titles: string[], query: string) {
  const normalized = query.toLocaleLowerCase("en");
  const values = titles.map((title) => ({ raw: title, normalized: title.toLocaleLowerCase("en") }));
  return {
    returned: titles.length,
    equals: values.filter((title) => title.normalized === normalized).length,
    startsWith: values.filter((title) => title.normalized.startsWith(normalized)).length,
    contains: values.filter((title) => title.normalized.includes(normalized)).length,
    endsWith: values.filter((title) => title.normalized.endsWith(normalized)).length,
    firstTitles: titles.slice(0, 10),
  };
}

async function main() {
  if (process.env.HARVEST_SEARCH_POSITION_AUDIT !== "1") {
    console.log("Harvest search-position audit skipped (set HARVEST_SEARCH_POSITION_AUDIT=1 to enable).");
    return;
  }

  const authUrl = process.env.HARVEST_AUTH_URL || "https://auth.harvestmedia.net/oauth2/token";
  const serviceUrl = process.env.HARVEST_SERVICE_URL || "https://service.harvestmedia.net/HMP-WS.svc";
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

  const direct = async (path: string, body?: unknown) => {
    const response = await fetch(`${serviceUrl}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Accept: "application/json",
        Authorization: accessToken,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, payload: await response.json().catch(() => ({})) };
  };

  const serviceWithKey = await fetch(`${serviceUrl}/getservicetoken`, {
    headers: { Accept: "application/json", Authorization: accessToken, AccessKey: required("HARVEST_ACCESS_KEY") },
  });
  const servicePayload = await serviceWithKey.json();
  const serviceToken = findString(servicePayload, ["Token", "Value"]);
  if (!serviceToken) throw new Error("Service token missing");

  const login = await direct(`/getmembertoken/${serviceToken}`, {
    UserName: required("HARVEST_TEST_MEMBER_EMAIL"),
    Password: required("HARVEST_TEST_MEMBER_PASSWORD"),
    PersistentLogin: false,
    ReturnMemberDetails: true,
  });
  const memberToken = findString(findObject(login.payload, "MemberToken"), ["Value", "Token"]);
  const regionId = findString(findObject(login.payload, "MemberAccount"), ["RegionID"]);
  if (!memberToken) throw new Error("Member token missing");

  const fixtures = [
    { view: "Track" as const, query: "Piano", exactQuery: "Piano Minuet", fields: "TrackDisplayTitle" },
    { view: "Album" as const, query: "Music", exactQuery: "MUSIC ON HOLD", fields: "AlbumDisplayTitle" },
  ];
  const results: JsonRecord[] = [];

  for (const fixture of fixtures) {
    const combinations: JsonRecord[] = [];
    for (const [exactPhrase, wildcard] of [[false, false], [false, true], [true, false], [true, true]] as const) {
      const body = buildCloudSearch({
        query: fixture.query,
        view: fixture.view,
        textScope: "title",
        skip: 0,
        limit: 100,
        language: "fr",
        regionId,
        saveSearchHistory: false,
      });
      const searchTerm = term(body);
      if (!searchTerm) throw new Error("St_Keyword missing");
      searchTerm.ExactPhrase = exactPhrase;
      searchTerm.Wildcard = wildcard;
      const response = await direct(`/cloudsearch/${memberToken}`, body);
      const collection = list(response.payload, fixture.view === "Track" ? "Tracks" : "Albums");
      const titles = collection.map((item) => findString(item, ["DisplayTitle", "Title", "Name"])).filter(Boolean);
      combinations.push({
        exactPhrase,
        wildcard,
        httpStatus: response.status,
        total: total(response.payload, fixture.view),
        ...summarizeTitles(titles, fixture.query),
      });
    }

    const exactBody = buildCloudSearch({
      query: fixture.exactQuery,
      view: fixture.view,
      textScope: "title",
      skip: 0,
      limit: 100,
      language: "fr",
      regionId,
      saveSearchHistory: false,
      match: "exact",
    });
    const exactTerm = term(exactBody);
    if (!exactTerm) throw new Error("Exact St_Keyword missing");
    exactTerm.ExactPhrase = true;
    exactTerm.Wildcard = false;
    const exactResponse = await direct(`/cloudsearch/${memberToken}`, exactBody);
    const exactTitles = list(exactResponse.payload, fixture.view === "Track" ? "Tracks" : "Albums")
      .map((item) => findString(item, ["DisplayTitle", "Title", "Name"]))
      .filter(Boolean);

    results.push({
      endpoint: "POST /cloudsearch/{memberToken}",
      view: fixture.view,
      query: fixture.query,
      fields: fixture.fields,
      sortPredefined: "RankExpression",
      rankExpression: "",
      combinations,
      strictTitleFixture: {
        query: fixture.exactQuery,
        httpStatus: exactResponse.status,
        total: total(exactResponse.payload, fixture.view),
        ...summarizeTitles(exactTitles, fixture.exactQuery),
      },
    });
  }

  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
