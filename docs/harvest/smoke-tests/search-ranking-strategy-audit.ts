import { buildCloudSearch } from "../../../src/lib/harvest/search";

type JsonRecord = Record<string, unknown>;
type SearchView = "Track" | "Album";

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
    if (keys.some((key) => key.toLowerCase() === candidate.toLowerCase())
        && (typeof nested === "string" || typeof nested === "number")) {
      return String(nested);
    }
  }
  for (const nested of Object.values(source)) {
    const found = findString(nested, keys);
    if (found) return found;
  }
  return "";
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

function records(value: unknown, key: string): JsonRecord[] {
  const source = record(value);
  const candidate = source && Object.entries(source)
    .find(([name]) => name.toLowerCase() === key.toLowerCase())?.[1];
  return Array.isArray(candidate)
    ? candidate.filter((item): item is JsonRecord => Boolean(record(item)))
    : [];
}

function normalizeWords(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function titleMatches(title: string, query: string): boolean {
  const titleWords = normalizeWords(title);
  return normalizeWords(query).every((term) => titleWords.includes(term));
}

function responseItems(payload: unknown, view: SearchView): JsonRecord[] {
  return records(payload, view === "Track" ? "Tracks" : "Albums");
}

function titles(payload: unknown, view: SearchView): string[] {
  return responseItems(payload, view)
    .map((item) => findString(item, ["DisplayTitle", "Title", "Name"]))
    .filter(Boolean);
}

function ids(payload: unknown, view: SearchView): string[] {
  return responseItems(payload, view).map((item) => findString(item, ["ID", "Id"])).filter(Boolean);
}

function total(payload: unknown, view: SearchView): number {
  return Number(record(payload)?.[view === "Track" ? "TotalTracks" : "TotalAlbums"] || 0);
}

async function main() {
  if (process.env.HARVEST_RANKING_STRATEGY_AUDIT !== "1") {
    console.log("Harvest ranking-strategy audit skipped (set HARVEST_RANKING_STRATEGY_AUDIT=1 to enable).");
    return;
  }

  const authUrl = process.env.HARVEST_AUTH_URL || "https://auth.harvestmedia.net/oauth2/token";
  const serviceUrl = process.env.HARVEST_SERVICE_URL || "https://service.harvestmedia.net/HMP-WS.svc";
  const bffBaseUrl = process.env.HARVEST_PREVIEW_BASE_URL || "http://127.0.0.1:3000";
  const oauthResponse = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: required("HARVEST_CLIENT_ID"),
      client_secret: required("HARVEST_CLIENT_SECRET"),
    }),
  });
  const accessToken = findString(await oauthResponse.json(), ["access_token"]);
  if (!accessToken) throw new Error("OAuth token missing");

  const call = async (path: string, init: RequestInit = {}) => {
    const startedAt = performance.now();
    const response = await fetch(`${serviceUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: accessToken,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
    return {
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
      payload: await response.json().catch(() => ({})),
    };
  };
  const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

  const service = await call("/getservicetoken", { headers: { AccessKey: required("HARVEST_ACCESS_KEY") } });
  const serviceToken = findString(service.payload, ["Token", "Value"]);
  const serviceInfo = await call(`/getserviceinfo/${serviceToken}`);
  const regions = await call(`/getregions/${serviceToken}`);
  const account = findObject(serviceInfo.payload, "Account");
  const regionId = findString(account, ["DefaultRegionID", "OverrideRegionID"])
    || findString(serviceInfo.payload, ["DefaultRegionID", "OverrideRegionID"])
    || findString(records(regions.payload, "Regions")[0], ["ID"]);
  const guest = await call(`/getguestmembertoken/${serviceToken}/${regionId}`);
  const guestToken = findString(guest.payload, ["Token", "Value"]);
  if (!serviceToken || !regionId || !guestToken) throw new Error("Harvest guest-token setup failed");

  const fixtures: Array<{ query: string; view: SearchView }> = [
    { query: "crime", view: "Track" },
    { query: "piano", view: "Track" },
    { query: "reggae sad", view: "Track" },
    { query: "reggae triste", view: "Track" },
    { query: "Music", view: "Album" },
    { query: "MUSIC ON HOLD", view: "Album" },
    { query: "Surf Fiction", view: "Album" },
  ];
  const results: JsonRecord[] = [];

  for (const fixture of fixtures) {
    const aggregateBody = buildCloudSearch({
      query: fixture.query,
      view: fixture.view,
      textScope: "aggregate",
      skip: 0,
      limit: 30,
      language: "fr",
      regionId,
      sort: "RankExpression",
      saveSearchHistory: false,
    });
    const titleBody = buildCloudSearch({
      query: fixture.query,
      view: fixture.view,
      textScope: "title",
      skip: 0,
      limit: 100,
      language: "fr",
      regionId,
      sort: "RankExpression",
      saveSearchHistory: false,
    });
    const bffUrl = new URL("/api/search", bffBaseUrl);
    for (const [key, value] of Object.entries({
      q: fixture.query,
      view: fixture.view === "Track" ? "tracks" : "albums",
      page: "1",
      limit: "30",
      type: "main",
      sort: "relevance",
      language: "fr",
      translation: "off",
    })) bffUrl.searchParams.set(key, value);

    const [aggregate, title, bff] = await Promise.all([
      call(`/cloudsearch/${guestToken}`, post(aggregateBody)),
      call(`/cloudsearch/${guestToken}`, post(titleBody)),
      (async () => {
        const startedAt = performance.now();
        const response = await fetch(bffUrl);
        return {
          status: response.status,
          durationMs: Math.round(performance.now() - startedAt),
          payload: await response.json().catch(() => ({})),
        };
      })(),
    ]);

    const aggregateTitles = titles(aggregate.payload, fixture.view);
    const titleTitles = titles(title.payload, fixture.view);
    const bffItems = records(record(bff.payload)?.data, "items");
    const bffTitles = bffItems.map((item) => findString(item, ["title", "DisplayTitle", "Name"])).filter(Boolean);
    const bffIds = bffItems.map((item) => findString(item, ["id", "ID"])).filter(Boolean);
    const aggregateIds = ids(aggregate.payload, fixture.view);
    const meta = record(bff.payload)?.meta;

    results.push({
      query: fixture.query,
      view: fixture.view,
      singleAggregate: {
        endpoint: "POST /cloudsearch/{guestToken}",
        httpStatus: aggregate.status,
        durationMs: aggregate.durationMs,
        total: total(aggregate.payload, fixture.view),
        verifiedVisibleTitlesInFirstPage: aggregateTitles.filter((titleValue) => titleMatches(titleValue, fixture.query)).length,
        firstTitles: aggregateTitles.slice(0, 10),
      },
      titleCandidateLane: {
        endpoint: "POST /cloudsearch/{guestToken}",
        httpStatus: title.status,
        durationMs: title.durationMs,
        rawTotal: total(title.payload, fixture.view),
        returned: titleTitles.length,
        locallyVerified: titleTitles.filter((titleValue) => titleMatches(titleValue, fixture.query)).length,
        firstTitles: titleTitles.slice(0, 10),
      },
      currentBff: {
        endpoint: "GET /api/search",
        httpStatus: bff.status,
        durationMs: bff.durationMs,
        providerDurationMs: Number(record(meta)?.providerDurationMs || 0),
        timings: record(record(meta)?.timings),
        total: Number(record(meta)?.total || 0),
        titleMatchTotal: Number(record(meta)?.titleMatchTotal || 0),
        firstTitles: bffTitles.slice(0, 10),
      },
      firstPageOverlap: {
        shared: bffIds.filter((id) => aggregateIds.includes(id)).length,
        bffOnly: bffIds.filter((id) => !aggregateIds.includes(id)).length,
        aggregateOnly: aggregateIds.filter((id) => !bffIds.includes(id)).length,
      },
    });
  }

  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
