import "server-only";

import { getHarvestApiConfig } from "./config";
import { assertNoHarvestError, HarvestError, isRecord } from "./errors";
import { asIsoDate, asNumber, asString, pick } from "./values";
import { logEvent } from "@/lib/logger";

interface CachedToken {
  value: string;
  expiresAt: number;
}

let accessToken: CachedToken | undefined;
let accessTokenPromise: Promise<CachedToken> | undefined;
let serviceToken: CachedToken | undefined;
let serviceTokenPromise: Promise<CachedToken> | undefined;
let serviceInfo: Record<string, unknown> | undefined;
let serviceInfoPromise: Promise<Record<string, unknown>> | undefined;
let regionId: string | undefined;
let regionIdPromise: Promise<string> | undefined;
const guestTokens = new Map<string, CachedToken>();
const guestTokenPromises = new Map<string, Promise<CachedToken>>();

const CLOCK_SKEW_MS = 60_000;

function valid(token: CachedToken | undefined): token is CachedToken {
  return Boolean(token && token.expiresAt - CLOCK_SKEW_MS > Date.now());
}

function findToken(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;
  for (const [key, value] of Object.entries(payload)) {
    if (["access_token", "token", "value", "membertoken", "servicetoken"].includes(key.toLowerCase())) {
      if (typeof value === "string" && value.length > 20) return value;
      const nested = findToken(value);
      if (nested) return nested;
    }
  }
  for (const value of Object.values(payload)) {
    const nested = findToken(value);
    if (nested) return nested;
  }
  return undefined;
}

function tokenExpiry(payload: unknown, fallbackMs: number): number {
  if (isRecord(payload)) {
    const seconds = asNumber(pick(payload, "expires_in", "ExpiresIn"), 0);
    if (seconds > 0) return Date.now() + seconds * 1000;
    const expiry = findValueByKey(payload, "expiry");
    const iso = asIsoDate(expiry);
    if (iso) return new Date(iso).getTime();
  }
  return Date.now() + fallbackMs;
}

function findValueByKey(payload: unknown, expectedKey: string): unknown {
  if (!isRecord(payload)) return undefined;
  for (const [key, value] of Object.entries(payload)) {
    if (key.toLowerCase() === expectedKey.toLowerCase()) return value;
    const nested = findValueByKey(value, expectedKey);
    if (nested !== undefined) return nested;
  }
  return undefined;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HarvestError("Harvest returned a non-JSON response", "HARVEST_INVALID_RESPONSE", 502, false);
  }
}

export async function fetchHarvestJsonWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<{ response: Response; payload: unknown }> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutFailure = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new HarvestError("Harvest request timed out", "HARVEST_UNAVAILABLE", 503, true));
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
        const payload = await readJson(response);
        return { response, payload };
      })(),
      timeoutFailure,
    ]);
  } catch (error) {
    if (error instanceof HarvestError) throw error;
    const message = error instanceof Error ? error.message : "Harvest request failed";
    throw new HarvestError(message, "HARVEST_UNAVAILABLE", 503, true);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function getAccessToken(force = false): Promise<CachedToken> {
  if (!force && valid(accessToken)) return accessToken;
  if (!force && accessTokenPromise) return accessTokenPromise;

  accessTokenPromise = (async () => {
    const config = getHarvestApiConfig();
    const { response, payload } = await fetchHarvestJsonWithTimeout(
      config.authUrl,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({
          grant_type: config.grantType,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
      },
      10_000,
    );
    if (!response.ok) throw new HarvestError("Unable to authenticate with Harvest", "HARVEST_UNAVAILABLE", 503, true);
    const value = findToken(payload);
    if (!value) throw new HarvestError("Harvest OAuth token is missing", "HARVEST_INVALID_RESPONSE");
    accessToken = { value, expiresAt: tokenExpiry(payload, 55 * 60_000) };
    return accessToken;
  })().finally(() => {
    accessTokenPromise = undefined;
  });
  return accessTokenPromise;
}

async function rawServiceRequest<T>(path: string, init: RequestInit = {}, timeoutMs = 10_000, retry = true): Promise<T> {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  const endpoint = path.split("?")[0].split("/").filter(Boolean)[0] || "unknown";
  const config = getHarvestApiConfig();
  const oauth = await getAccessToken();
  const idempotent = !init.method || init.method === "GET" || /\/(cloudsearch|autocomplete)\//.test(path);
  let response: Response;
  let payload: unknown;
  try {
    const result = await fetchHarvestJsonWithTimeout(
      `${config.serviceUrl}${path}`,
      {
        ...init,
        headers: {
          Accept: "application/json",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          Authorization: oauth.value,
          ...init.headers,
        },
      },
      timeoutMs,
    );
    response = result.response;
    payload = result.payload;
  } catch (error) {
    if (retry && idempotent && error instanceof HarvestError && error.retryable) {
      await new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 250));
      return rawServiceRequest<T>(path, init, timeoutMs, false);
    }
    throw error;
  }
  logEvent({ level: response.ok ? "info" : "warn", message: "harvest_request", route: endpoint, durationMs: Date.now() - startedAt, status: response.status, requestId });
  if (response.status === 429) {
    if (retry && idempotent) {
      await new Promise((resolve) => setTimeout(resolve, 400 + Math.random() * 400));
      return rawServiceRequest<T>(path, init, timeoutMs, false);
    }
    throw new HarvestError("Harvest rate limit reached", "RATE_LIMITED", 429, true);
  }
  if (!response.ok) {
    if (retry && idempotent && response.status >= 500) {
      await new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 250));
      return rawServiceRequest<T>(path, init, timeoutMs, false);
    }
    throw new HarvestError("Harvest request failed", "HARVEST_UNAVAILABLE", 502, response.status >= 500);
  }
  try {
    assertNoHarvestError(payload);
  } catch (error) {
    logEvent({ level: "warn", message: "harvest_upstream_error", route: endpoint, durationMs: Date.now() - startedAt, status: error instanceof HarvestError ? error.status : 502, code: error instanceof HarvestError ? error.upstreamCode : undefined, requestId });
    if (retry && error instanceof HarvestError && error.retryable) {
      accessToken = undefined;
      await getAccessToken(true);
      return rawServiceRequest<T>(path, init, timeoutMs, false);
    }
    throw error;
  }
  return payload as T;
}

export async function getServiceToken(force = false): Promise<CachedToken> {
  if (!force && valid(serviceToken)) return serviceToken;
  if (!force && serviceTokenPromise) return serviceTokenPromise;

  serviceTokenPromise = (async () => {
    const config = getHarvestApiConfig();
    const oauth = await getAccessToken();
    const { payload } = await fetchHarvestJsonWithTimeout(
      `${config.serviceUrl}/getservicetoken`,
      { headers: { Accept: "application/json", AccessKey: config.accessKey, Authorization: oauth.value } },
      10_000,
    );
    assertNoHarvestError(payload);
    const value = findToken(payload);
    if (!value) throw new HarvestError("Harvest service token is missing", "HARVEST_INVALID_RESPONSE");
    serviceToken = { value, expiresAt: tokenExpiry(payload, 23 * 60 * 60_000) };
    return serviceToken;
  })().finally(() => {
    serviceTokenPromise = undefined;
  });
  return serviceTokenPromise;
}

export async function getServiceInfo(): Promise<Record<string, unknown>> {
  if (serviceInfo) return serviceInfo;
  if (serviceInfoPromise) return serviceInfoPromise;
  serviceInfoPromise = (async () => {
    const token = await getServiceToken();
    const payload = await rawServiceRequest<Record<string, unknown>>(`/getserviceinfo/${token.value}`);
    serviceInfo = payload;
    return payload;
  })().finally(() => {
    serviceInfoPromise = undefined;
  });
  return serviceInfoPromise;
}

export async function getRegionId(): Promise<string> {
  if (regionId) return regionId;
  if (regionIdPromise) return regionIdPromise;
  regionIdPromise = resolveRegionId().finally(() => { regionIdPromise = undefined; });
  return regionIdPromise;
}

async function resolveRegionId(): Promise<string> {
  const config = getHarvestApiConfig();
  if (config.defaultRegionId) {
    regionId = config.defaultRegionId;
    return regionId;
  }
  const info = await getServiceInfo();
  const global = isRecord(info.AccountGlobalSettingsAndRegions)
    ? info.AccountGlobalSettingsAndRegions
    : undefined;
  const account = global && isRecord(global.Account) ? global.Account : undefined;
  const fromAccount = account ? asString(pick(account, "DefaultRegionID", "OverrideRegionID")) : "";
  if (fromAccount) {
    regionId = fromAccount;
    return regionId;
  }

  const token = await getServiceToken();
  const regions = await rawServiceRequest<Record<string, unknown>>(`/getregions/${token.value}`);
  const first = Array.isArray(regions.Regions) && isRecord(regions.Regions[0]) ? regions.Regions[0] : undefined;
  const id = first ? asString(first.ID) : "";
  if (!id) throw new HarvestError("No Harvest region is available", "HARVEST_INVALID_RESPONSE");
  regionId = id;
  return regionId;
}

export async function getGuestToken(regionId?: string, force = false): Promise<CachedToken> {
  const region = regionId || (await getRegionId());
  const cached = guestTokens.get(region);
  if (!force && valid(cached)) return cached;
  const pending = guestTokenPromises.get(region);
  if (!force && pending) return pending;

  const promise = (async () => {
    const service = await getServiceToken();
    const payload = await rawServiceRequest<Record<string, unknown>>(
      `/getguestmembertoken/${service.value}/${encodeURIComponent(region)}`,
    );
    const value = findToken(payload);
    if (!value) throw new HarvestError("Harvest guest token is missing", "HARVEST_INVALID_RESPONSE");
    const token = { value, expiresAt: tokenExpiry(payload, 23 * 60 * 60_000) };
    guestTokens.set(region, token);
    return token;
  })().finally(() => {
    guestTokenPromises.delete(region);
  });
  guestTokenPromises.set(region, promise);
  return promise;
}

export async function guestRequest<T>(
  path: (memberToken: string) => string,
  init: RequestInit = {},
  options: { timeoutMs?: number; regionId?: string } = {},
): Promise<T> {
  const token = await getGuestToken(options.regionId);
  try {
    return await rawServiceRequest<T>(path(token.value), init, options.timeoutMs ?? 10_000);
  } catch (error) {
    if (error instanceof HarvestError && error.code === "UNAUTHENTICATED") {
      guestTokens.delete(options.regionId || (await getRegionId()));
      const refreshed = await getGuestToken(options.regionId, true);
      return rawServiceRequest<T>(path(refreshed.value), init, options.timeoutMs ?? 10_000, false);
    }
    throw error;
  }
}

export async function serviceRequest<T>(
  path: (serviceToken: string) => string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getServiceToken();
  return rawServiceRequest<T>(path(token.value), init);
}

export async function memberRequest<T>(
  memberToken: string,
  path: (token: string) => string,
  init: RequestInit = {},
  timeoutMs = 10_000,
): Promise<T> {
  return rawServiceRequest<T>(path(memberToken), init, timeoutMs);
}

export function findHarvestToken(payload: unknown): string | undefined {
  return findToken(payload);
}

export function getHarvestTokenExpiry(payload: unknown, fallbackMs = 23 * 60 * 60_000): number {
  return tokenExpiry(payload, fallbackMs);
}
