import "server-only";

import { serviceRequest } from "./client";
import { HarvestError, isRecord } from "./errors";
import { asString } from "./values";

export async function createHarvestShortUrl(url: string): Promise<string> {
  const payload = await serviceRequest<Record<string, unknown>>(
    (token) => `/getshorturl/${token}`,
    { method: "POST", body: JSON.stringify({ URL: url }) },
  );
  const nested = isRecord(payload.ShortUrl) ? payload.ShortUrl : isRecord(payload.ShortURL) ? payload.ShortURL : undefined;
  const value = asString(payload.Url || payload.URL || nested?.Url || nested?.URL).trim();
  if (!value) throw new HarvestError("Harvest short URL is missing", "HARVEST_INVALID_RESPONSE");
  const parsed = new URL(value);
  if (parsed.protocol !== "https:") throw new HarvestError("Harvest short URL is not HTTPS", "HARVEST_INVALID_RESPONSE");
  return parsed.toString();
}
