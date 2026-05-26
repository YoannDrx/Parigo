type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const requiredEnv = [
  "HARVEST_AUTH_URL",
  "HARVEST_SERVICE_URL",
  "HARVEST_ACCESS_KEY",
  "HARVEST_CLIENT_ID",
  "HARVEST_CLIENT_SECRET",
] as const;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function authHeader(token: string): string {
  const prefix = process.env.HARVEST_AUTH_HEADER_PREFIX ?? "Bearer";
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

  console.log(JSON.stringify(parsed.json, null, 2).slice(0, 1600));
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
  for (const name of requiredEnv) requireEnv(name);

  const accessToken = await getAccessToken();
  const authorization = authHeader(accessToken);
  const serviceToken = await getServiceToken(accessToken);
  const serviceUrl = requireEnv("HARVEST_SERVICE_URL");

  await requestJson("Get Service Info", `${serviceUrl}/getserviceinfo/${serviceToken}`, {
    headers: { Accept: "application/json", Authorization: authorization },
  });

  const testIp = process.env.HARVEST_TEST_IP;
  if (testIp) {
    await requestJson("Get Region By IP", `${serviceUrl}/getregionbyip/${serviceToken}?ip=${encodeURIComponent(testIp)}`, {
      headers: { Accept: "application/json", Authorization: authorization },
    });
  } else {
    await requestJson("Get Regions", `${serviceUrl}/getregions/${serviceToken}`, {
      headers: { Accept: "application/json", Authorization: authorization },
    });
  }

  const regionId = process.env.HARVEST_REGION_ID;
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
  await requestJson("Cloud Search", `${serviceUrl}/cloudsearch/${guestToken}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: authorization,
    },
    body: JSON.stringify({
      SaveSearchHistory: "false",
      SearchFilters: {
        SearchType: "Normal",
        IncludeInactive: "false",
        MainOnly: "true",
        AlternateOnly: "false",
        NearestBPM: "false",
        NearestDuration: "false",
        NearestAlternate: "false",
        ParentSearchHistoryID: "",
        SearchTermBundle: {
          St_Keyword_Aggregated: {
            ExactPhrase: "false",
            Wildcard: "true",
            DisableKeywordGroup: "false",
            OrOperation: "false",
            Keywords: keyword,
            Negative: "false",
          },
        },
        ResultView: {
          View: "Track",
          Sort_Predefined: "ReleaseDate_Desc",
          RankExpression: "",
          Skip: "0",
          Limit: "10",
          Facet_Library: "true",
          Facet_BPM: "true",
          Facet_Duration: "true",
          Facet_Category: "true",
        },
      },
    }),
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
