export {};

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

function errorSummary(payload: unknown) {
  const error = record(record(payload)?.Error);
  return {
    code: error?.Code == null ? null : String(error.Code),
    description: error?.Description == null ? null : String(error.Description),
  };
}

function languageFields(member: JsonRecord) {
  return Object.entries(member)
    .filter(([key]) => ["language", "languagecode"].includes(key.toLowerCase()))
    .map(([key, value]) => ({ key, value: value == null ? null : String(value) }));
}

function memberUpdatePayload(member: JsonRecord, languageCode?: string) {
  const text = (key: string) => {
    const value = member[key];
    return value == null ? "" : String(value);
  };
  const bool = (key: string) => {
    const value = member[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    return ["true", "1", "yes"].includes(String(value || "").toLowerCase());
  };
  return {
    MemberAccount: {
      ID: text("ID"),
      FirstName: text("FirstName"),
      LastName: text("LastName"),
      Email: text("Email"),
      Username: text("Username") || text("Email"),
      Company: text("Company"),
      Country: text("Country"),
      Production: text("Production"),
      SubProduction: text("SubProduction"),
      Position: text("Position"),
      Address1: text("Address1"),
      Address2: text("Address2"),
      Suburb: text("Suburb"),
      State: text("State"),
      Postcode: text("Postcode"),
      Phone: text("Phone"),
      FileFormat: text("FileFormat"),
      Website: text("Website"),
      TermsAccept: bool("TermsAccept"),
      PrivacyAccept: bool("PrivacyAccept"),
      SearchFormat: "Track",
      SearchSort: "New",
      Attributes: [],
      Status: text("Status") || "Active",
      ...(languageCode ? { LanguageCode: languageCode } : {}),
    },
  };
}

async function main() {
  if (process.env.HARVEST_MEMBER_LANGUAGE_AUDIT !== "1") {
    console.log("Harvest member-language audit skipped (set HARVEST_MEMBER_LANGUAGE_AUDIT=1 to enable).");
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
    UserName: required("HARVEST_TEST_MEMBER_EMAIL"),
    Password: required("HARVEST_TEST_MEMBER_PASSWORD"),
    PersistentLogin: false,
    ReturnMemberDetails: true,
  }));
  const memberToken = findString(findObject(login.payload, "MemberToken"), ["Value", "Token"]);
  if (!memberToken) throw new Error("Member token missing");

  const readMember = async () => {
    const response = await direct(`/getmember/${memberToken}`);
    const member = findObject(response.payload, "MemberAccount")
      || findObject(response.payload, "Member")
      || findObject(response.payload, "MemberDetails")
      || record(response.payload);
    if (!member) throw new Error("MemberAccount missing");
    return { response, member };
  };

  const original = await readMember();
  const originalLanguage = findString(original.member, ["LanguageCode", "Language"]);
  const requestedLanguage = originalLanguage.toUpperCase() === "FR" ? "EN" : "FR";
  let update: Awaited<ReturnType<typeof direct>> | undefined;
  let observed = original;
  let restore: Awaited<ReturnType<typeof direct>> | undefined;

  try {
    update = await direct(
      `/updatemember/${memberToken}`,
      post(memberUpdatePayload(original.member, requestedLanguage)),
    );
    for (const delay of [0, 500, 1_500]) {
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      observed = await readMember();
      if (findString(observed.member, ["LanguageCode", "Language"]).toUpperCase() === requestedLanguage) break;
    }
  } finally {
    restore = await direct(
      `/updatemember/${memberToken}`,
      post(memberUpdatePayload(original.member, originalLanguage || undefined)),
    );
  }

  const restored = await readMember();
  const observedLanguage = findString(observed.member, ["LanguageCode", "Language"]);
  const restoredLanguage = findString(restored.member, ["LanguageCode", "Language"]);
  console.log(JSON.stringify({
    endpoint: "POST /updatemember/{memberToken}",
    payloadDelta: { LanguageCode: requestedLanguage },
    before: {
      languageCode: originalLanguage,
      languageFields: languageFields(original.member),
      country: findString(original.member, ["Country"]),
      regionId: findString(original.member, ["RegionID"]),
    },
    update: { httpStatus: update?.status, ...errorSummary(update?.payload) },
    after: {
      languageCode: observedLanguage,
      languageFields: languageFields(observed.member),
      changed: observedLanguage.toUpperCase() === requestedLanguage,
      country: findString(observed.member, ["Country"]),
      regionId: findString(observed.member, ["RegionID"]),
    },
    restore: {
      httpStatus: restore?.status,
      ...errorSummary(restore?.payload),
      languageCode: restoredLanguage,
      restored: restoredLanguage.toUpperCase() === originalLanguage.toUpperCase(),
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
