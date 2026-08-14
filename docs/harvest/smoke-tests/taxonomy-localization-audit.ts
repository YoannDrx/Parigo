export {};

type JsonRecord = Record<string, unknown>;

interface Coverage {
  total: number;
  localized: number;
  missing: number;
}

function record(value: unknown): JsonRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : undefined;
}

function records(value: unknown, key: string): JsonRecord[] {
  const candidate = record(value)?.[key];
  return Array.isArray(candidate)
    ? candidate.filter((item): item is JsonRecord => Boolean(record(item)))
    : [];
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
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
    if (keys.some((candidate) => candidate.toLocaleLowerCase("en") === key.toLocaleLowerCase("en"))
      && (typeof nested === "string" || typeof nested === "number")
      && String(nested)) {
      return String(nested);
    }
  }
  for (const nested of Object.values(source)) {
    const found = findString(nested, keys);
    if (found) return found;
  }
  return "";
}

function localizedValue(item: JsonRecord, language: string): string {
  const match = records(item, "LanguageItems").find((languageItem) => {
    const code = findString(languageItem, [
      "LanguageCode_ISO639_1",
      "LanguageCode",
      "Language",
      "CultureCode",
    ]).trim().toLocaleLowerCase("en").split(/[-_]/)[0];
    return code === language;
  });
  return match ? findString(match, ["Value", "Name", "Text"]).trim() : "";
}

function flattenCategories(items: JsonRecord[], rootName?: string): Array<JsonRecord & { rootName: string }> {
  return items.flatMap((item) => {
    const currentRoot = rootName || String(item.Name || "Unknown");
    return [
      { ...item, rootName: currentRoot },
      ...flattenCategories(records(item, "Attributes"), currentRoot),
    ];
  });
}

function coverage(items: JsonRecord[]): Coverage {
  const localized = items.filter((item) => Boolean(localizedValue(item, "fr"))).length;
  return { total: items.length, localized, missing: items.length - localized };
}

async function main() {
  const authUrl = process.env.HARVEST_AUTH_URL || "https://auth.harvestmedia.net/oauth2/token";
  const serviceUrl = process.env.HARVEST_SERVICE_URL || "https://service.harvestmedia.net/HMP-WS.svc";
  const oauthResponse = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept-Encoding": "identity" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: required("HARVEST_CLIENT_ID"),
      client_secret: required("HARVEST_CLIENT_SECRET"),
    }),
  });
  if (!oauthResponse.ok) throw new Error(`Harvest OAuth returned HTTP ${oauthResponse.status}`);
  const accessToken = findString(await oauthResponse.json(), ["access_token"]);
  if (!accessToken) throw new Error("Harvest OAuth token missing");

  async function call(path: string, extraHeaders: Record<string, string> = {}): Promise<JsonRecord> {
    const response = await fetch(`${serviceUrl}${path}`, {
      headers: {
        Accept: "application/json",
        Authorization: accessToken,
        "Accept-Encoding": "identity",
        ...extraHeaders,
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Harvest returned HTTP ${response.status} for ${path.split("?")[0]}`);
    return record(await response.json()) || {};
  }

  const service = await call("/getservicetoken", { AccessKey: required("HARVEST_ACCESS_KEY") });
  const serviceToken = findString(service, ["Value", "Token"]);
  const regions = await call(`/getregions/${serviceToken}`);
  const regionId = findString(regions, ["ID", "RegionID"]);
  const guest = await call(`/getguestmembertoken/${serviceToken}/${regionId}`);
  const guestToken = findString(guest, ["Value", "Token"]);
  if (!serviceToken || !regionId || !guestToken) throw new Error("Harvest guest-token setup failed");

  const categoryPayload = await call(`/getcategories/${guestToken}/hasactivetrackonly?languagecode=fr`);
  const categoryRows = flattenCategories(records(categoryPayload, "Categories"));
  const categoryGroups = records(categoryPayload, "Categories").map((group) => {
    const name = String(group.Name || "Unknown");
    return { name, ...coverage(categoryRows.filter((item) => item.rootName === name)) };
  });
  const styles = records(await call(`/getstyles/${guestToken}/fr?groupID=`), "Styles");
  const sad = categoryRows.find((item) => String(item.ID) === "b71182fbd44d6ef6");
  const sadFrench = sad ? localizedValue(sad, "fr") : "";

  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(),
    categories: { ...coverage(categoryRows), groups: categoryGroups },
    styles: coverage(styles),
    acceptanceFixture: {
      id: sad?.ID,
      canonicalName: sad?.Name,
      localizedName: sadFrench,
    },
  }, null, 2));

  if (!sad || sad.Name !== "Sad" || sadFrench !== "Triste") {
    throw new Error(`French Sad contract failed (canonical=${String(sad?.Name)}, localized=${sadFrench})`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
