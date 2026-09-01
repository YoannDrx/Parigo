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

function aggregatedTerm(body: JsonRecord): JsonRecord {
  const filters = record(body.SearchFilters);
  const bundle = record(filters?.SearchTermBundle);
  const term = record(bundle?.St_Keyword_Aggregated);
  if (!term) throw new Error("St_Keyword_Aggregated missing");
  return term;
}

async function main() {
  if (process.env.HARVEST_KEYWORD_GROUP_AUDIT !== "1") {
    console.log("Harvest keyword-group audit skipped (set HARVEST_KEYWORD_GROUP_AUDIT=1 to enable).");
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
  const accessToken = findString(await oauthResponse.json(), ["access_token"]);
  if (!accessToken) throw new Error("OAuth token missing");

  const call = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${serviceUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: accessToken,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
      signal: AbortSignal.timeout(30_000),
    });
    return { status: response.status, payload: await response.json().catch(() => ({})) };
  };
  const service = await call("/getservicetoken", {
    headers: { AccessKey: required("HARVEST_ACCESS_KEY") },
  });
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

  const queries = [
    "reggae sad",
    "reggae triste",
    "sad",
    "triste",
    "brazil",
    "brésil",
    "bresil",
    "calm",
    "calme",
    "happy",
    "heureux",
    "electro",
    "électro",
    "abstract",
    "abstrait",
    "1910",
    "10s",
    "1920",
    "20s",
    "twenties",
    "1930",
    "30s",
    "thirties",
    "1940",
    "40s",
    "fourties",
    "1950",
    "50s",
    "fifties",
    "1960",
    "60s",
    "sixties",
    "1970",
    "seventies",
    "1980",
    "80s",
    "eighties",
    "1990",
    "90s",
    "nineties",
    "atmospheres",
    "balkan",
    "balkans",
    "blues",
    "blues rock",
    "delta blues",
    "boogie-woogie",
    "hip hop",
    "hip-hop",
    "hiphop",
    "soundtrack",
    "symphonic",
    "symophonic",
  ];
  const results: JsonRecord[] = [];

  for (const query of queries) {
    const run = async (disableKeywordGroup: boolean) => {
      const body = buildCloudSearch({
        query,
        view: "Track",
        textScope: "aggregate",
        skip: 0,
        limit: 30,
        language: "fr",
        regionId,
        sort: "RankExpression",
        saveSearchHistory: false,
      });
      aggregatedTerm(body).DisableKeywordGroup = disableKeywordGroup;
      const response = await call(`/cloudsearch/${guestToken}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const tracks = records(response.payload, "Tracks");
      return {
        status: response.status,
        total: Number(record(response.payload)?.TotalTracks || 0),
        ids: tracks.map((item) => findString(item, ["ID", "Id"])).filter(Boolean),
        firstTitles: tracks
          .map((item) => findString(item, ["DisplayTitle", "Title", "Name"]))
          .filter(Boolean)
          .slice(0, 10),
      };
    };
    const [groupsEnabled, groupsDisabled] = await Promise.all([run(false), run(true)]);
    results.push({
      query,
      endpoint: "POST /cloudsearch/{guestToken}",
      groupsEnabled: {
        httpStatus: groupsEnabled.status,
        total: groupsEnabled.total,
        firstTitles: groupsEnabled.firstTitles,
      },
      groupsDisabled: {
        httpStatus: groupsDisabled.status,
        total: groupsDisabled.total,
        firstTitles: groupsDisabled.firstTitles,
      },
      firstPageDifference: {
        enabledOnly: groupsEnabled.ids.filter((id) => !groupsDisabled.ids.includes(id)).length,
        disabledOnly: groupsDisabled.ids.filter((id) => !groupsEnabled.ids.includes(id)).length,
      },
    });
  }

  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
