export {};

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const requiredEnv = [
  "HARVEST_AUTH_URL",
  "HARVEST_SERVICE_URL",
  "HARVEST_ACCESS_KEY",
  "HARVEST_CLIENT_ID",
  "HARVEST_CLIENT_SECRET",
] as const;

function requireEnv(name: string): string {
  const aliases: Record<string, string | undefined> = {
    HARVEST_AUTH_URL: "https://auth.harvestmedia.net/oauth2/token",
    HARVEST_SERVICE_URL: "https://service.harvestmedia.net/HMP-WS.svc",
    HARVEST_ACCESS_KEY: process.env.HM_ServiceAPI_Key,
    HARVEST_CLIENT_ID: process.env.HM_ServiceAPI_AuthClientID,
    HARVEST_CLIENT_SECRET: process.env.HM_ServiceAPI_AuthClientSecret,
  };
  const value = process.env[name] || aliases[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function authHeader(token: string): string {
  const prefix = process.env.HARVEST_AUTH_HEADER_PREFIX ?? "";
  return prefix ? `${prefix} ${token}` : token;
}

async function readResponse(response: Response): Promise<{ text: string; json?: JsonValue }> {
  const text = await response.text();
  try {
    return { text, json: JSON.parse(text) as JsonValue };
  } catch {
    return { text };
  }
}

function findStringByKey(value: JsonValue | undefined, keys: string[]): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStringByKey(item, keys);
      if (found) return found;
    }
    return undefined;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (keys.some((candidate) => candidate.toLowerCase() === key.toLowerCase()) && typeof nested === "string") {
      return nested;
    }
  }

  for (const nested of Object.values(value)) {
    const found = findStringByKey(nested, keys);
    if (found) return found;
  }

  return undefined;
}

function redact(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") {
    if (typeof value === "string" && /^https?:/i.test(value)) {
      try {
        const url = new URL(value);
        for (const key of [...url.searchParams.keys()]) {
          if (/token|key|secret/i.test(key)) url.searchParams.set(key, "[redacted]");
        }
        return url.toString();
      } catch { return value; }
    }
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [
      key,
      /token|secret|accesskey/i.test(key) ? "[redacted]" : redact(nested),
    ]),
  );
}

async function requestJson(label: string, input: string, init?: RequestInit): Promise<JsonValue | undefined> {
  const response = await fetch(input, init);
  const parsed = await readResponse(response);
  console.log(`${label}: HTTP ${response.status}`);

  if (!response.ok) {
    console.log(parsed.text.slice(0, 1000));
    throw new Error(`${label} failed`);
  }

  if (!parsed.json) {
    console.log(parsed.text.slice(0, 1000));
    return undefined;
  }

  console.log(JSON.stringify(redact(parsed.json), null, 2).slice(0, 1600));
  return parsed.json;
}

async function getAccessToken(): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: requireEnv("HARVEST_CLIENT_ID"),
    client_secret: requireEnv("HARVEST_CLIENT_SECRET"),
  });

  const json = await requestJson("Get Authorised", requireEnv("HARVEST_AUTH_URL"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const token = findStringByKey(json, ["access_token", "token", "AccessToken", "Value"]);
  if (!token) throw new Error("Could not find access token in response");
  return token;
}

async function getServiceToken(accessToken: string): Promise<string> {
  const json = await requestJson("Get Service Token", `${requireEnv("HARVEST_SERVICE_URL")}/getservicetoken`, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      AccessKey: requireEnv("HARVEST_ACCESS_KEY"),
      Authorization: authHeader(accessToken),
    },
  });

  const token = findStringByKey(json, ["Token", "ServiceToken", "Value"]);
  if (!token) throw new Error("Could not find service token in response");
  return token;
}

async function main() {
  if (process.env.HARVEST_LIVE_TESTS !== "1") {
    console.log("Harvest live tests skipped (set HARVEST_LIVE_TESTS=1 to enable). ");
    return;
  }
  for (const name of requiredEnv) requireEnv(name);

  const accessToken = await getAccessToken();
  const authorization = authHeader(accessToken);
  const serviceToken = await getServiceToken(accessToken);
  const serviceUrl = requireEnv("HARVEST_SERVICE_URL");

  const serviceInfo = await requestJson("Get Service Info", `${serviceUrl}/getserviceinfo/${serviceToken}`, {
    headers: { Accept: "application/json", Authorization: authorization },
  });

  const testIp = process.env.HARVEST_TEST_IP;
  let regionInfo: JsonValue | undefined;
  if (testIp) {
    regionInfo = await requestJson("Get Region By IP", `${serviceUrl}/getregionbyip/${serviceToken}?ip=${encodeURIComponent(testIp)}`, {
      headers: { Accept: "application/json", Authorization: authorization },
    });
  } else {
    regionInfo = await requestJson("Get Regions", `${serviceUrl}/getregions/${serviceToken}`, {
      headers: { Accept: "application/json", Authorization: authorization },
    });
  }

  const regionId = process.env.HARVEST_REGION_ID
    || findStringByKey(serviceInfo, ["DefaultRegionID", "OverrideRegionID"])
    || findStringByKey(regionInfo, ["ID", "RegionID"]);
  if (!regionId) {
    console.log("HARVEST_REGION_ID not set; skipping guest member and search tests.");
    return;
  }

  const guestJson = await requestJson("Authenticate Guest Member", `${serviceUrl}/getguestmembertoken/${serviceToken}/${regionId}`, {
    headers: { Accept: "application/json", Authorization: authorization },
  });
  const guestToken = findStringByKey(guestJson, ["Token", "MemberToken", "Value"]);
  if (!guestToken) throw new Error("Could not find guest member token in response");

  const keyword = process.env.HARVEST_SEARCH_KEYWORD ?? "piano";
  const searchResponse = await requestJson("Cloud Search", `${serviceUrl}/cloudsearch/${guestToken}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: authorization,
    },
    body: JSON.stringify({
      SaveSearchHistory: false,
      RegionID: regionId,
      SearchFilters: {
        SearchType: "Normal",
        LibraryType: "",
        IncludeInactive: false,
        MainOnly: true,
        AlternateOnly: false,
        NearestBPM: false,
        NearestDuration: false,
        NearestAlternate: false,
        TranslateKeyword: "fr",
        ParentSearchHistoryID: "",
        SearchTermBundle: {
          St_Keyword_Aggregated: {
            ExactPhrase: false,
            Wildcard: true,
            DisableKeywordGroup: false,
            OrOperation: false,
            Keywords: keyword,
            Negative: false,
          },
        },
        ResultView: {
          View: "Track",
          Sort_Predefined: "RankExpression",
          RankExpression: "",
          Skip: "0",
          Limit: "10",
          ReturnRates: false,
          Facet_Library: true,
          Facet_Style: true,
          Facet_BPM: true,
          Facet_Duration: true,
          Facet_Category: true,
        },
      },
    }),
  });
  const serializedSearch = JSON.stringify(searchResponse);
  if (!serializedSearch.includes('"sort_predefined":"RankExpression"')) {
    throw new Error("Cloud Search did not preserve Harvest RankExpression relevance sorting");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
