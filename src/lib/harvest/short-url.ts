import "server-only";

import { serviceRequest } from "./client";
import { HarvestError, isRecord } from "./errors";
import { asString } from "./values";

export async function createHarvestShortUrl(url: string): Promise<string> {
  const payload = await serviceRequest<Record<string, unknown>>(
    (token) => `/getshorturl/${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: `<requesturl><url>${url}</url></requesturl>`,
    },
  );
  const nested = isRecord(payload.ShortUrl) ? payload.ShortUrl : isRecord(payload.ShortURL) ? payload.ShortURL : undefined;
  const value = asString(payload.Url || payload.URL || nested?.Url || nested?.URL).trim();
  if (!value) throw new HarvestError("Harvest short URL is missing", "HARVEST_INVALID_RESPONSE");
  const parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  if (parsed.protocol !== "https:" || parsed.hostname !== "hrvst.co") {
    throw new HarvestError("Harvest short URL is not trusted", "HARVEST_INVALID_RESPONSE");
  }
  return parsed.toString();
}
