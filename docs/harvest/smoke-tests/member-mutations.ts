export {};

type JsonRecord = Record<string, unknown>;

function required(name: string, aliases: string[] = []): string {
  for (const key of [name, ...aliases]) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  throw new Error(`Missing ${name}`);
}

function record(value: unknown): JsonRecord | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : undefined;
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
    if (keys.some((candidate) => candidate.toLowerCase() === key.toLowerCase()) && typeof nested === "string" && nested) return nested;
  }
  for (const nested of Object.values(object)) {
    const found = findString(nested, keys);
    if (found) return found;
  }
  return undefined;
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

function logicalError(value: unknown): string | undefined {
  const object = record(value);
  if (!object) return undefined;
  const error = record(object.Error) || (typeof object.Error === "string" ? { Message: object.Error } : undefined);
  return error ? String(error.Message || error.ErrorMessage || error.Code || "Harvest logical error") : undefined;
}

async function requestJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => undefined);
  if (!response.ok) throw new Error(`Harvest returned HTTP ${response.status}`);
  const error = logicalError(payload);
  if (error) throw new Error(error);
  return payload;
}

async function main() {
  if (process.env.HARVEST_MEMBER_MUTATION_TESTS !== "1") {
    console.log("Harvest member mutation tests skipped (set HARVEST_MEMBER_MUTATION_TESTS=1 to enable).");
    return;
  }

  const authUrl = process.env.HARVEST_AUTH_URL || "https://auth.harvestmedia.net/oauth2/token";
  const serviceUrl = process.env.HARVEST_SERVICE_URL || "https://service.harvestmedia.net/HMP-WS.svc";
  const accessKey = required("HARVEST_ACCESS_KEY", ["HM_ServiceAPI_Key"]);
  const clientId = required("HARVEST_CLIENT_ID", ["HM_ServiceAPI_AuthClientID"]);
  const clientSecret = required("HARVEST_CLIENT_SECRET", ["HM_ServiceAPI_AuthClientSecret"]);
  const email = required("HARVEST_TEST_MEMBER_EMAIL");
  const password = required("HARVEST_TEST_MEMBER_PASSWORD");
  const resources = new Set<string>();

  const oauth = await requestJson(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
  });
  const accessToken = findString(oauth, ["access_token"]);
  if (!accessToken) throw new Error("Harvest did not return an OAuth access token");
  const headers = { Accept: "application/json", Authorization: accessToken };
  const service = await requestJson(`${serviceUrl}/getservicetoken`, { headers: { ...headers, AccessKey: accessKey } });
  const serviceToken = findString(service, ["Token", "ServiceToken", "Value"]);
  if (!serviceToken) throw new Error("Harvest did not return a service token");
  const login = await requestJson(`${serviceUrl}/getmembertoken/${serviceToken}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ UserName: email, Password: password, PersistentLogin: true, ReturnMemberDetails: true }),
  });
  const memberToken = findString(findObject(login, "Token"), ["Value"]);
  if (!memberToken) throw new Error("Harvest did not return a member token");

  let tagId = "";
  try {
    const member = await requestJson(`${serviceUrl}/getmember/${memberToken}`, { headers });
    const status = findString(member, ["Status"]);
    if (status?.toLowerCase() !== "active") throw new Error(`Test member is not active (${status || "unknown"})`);

    const suffix = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    const created = await requestJson(`${serviceUrl}/addmembertag/${memberToken}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ TagName: `Parigo API test ${suffix}` }),
    });
    tagId = findString(created, ["TagID", "ID"]) || "";
    if (!tagId) throw new Error("Harvest did not return the created tag ID");
    resources.add(`tag:${tagId}`);

    await requestJson(`${serviceUrl}/updatemembertag/${memberToken}/${encodeURIComponent(tagId)}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ TagName: `Parigo API test ${suffix} renamed` }),
    });
    console.log(JSON.stringify({ member: "active", tagLifecycle: "passed" }));
  } finally {
    if (tagId) {
      try {
        await requestJson(`${serviceUrl}/removemembertag/${memberToken}/${encodeURIComponent(tagId)}`, { headers });
        resources.delete(`tag:${tagId}`);
      } catch (error) {
        console.error(`Cleanup failed for tag ${tagId}: ${error instanceof Error ? error.message : error}`);
      }
    }
    if (resources.size) {
      console.error(`Remaining test resources: ${[...resources].join(", ")}`);
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
