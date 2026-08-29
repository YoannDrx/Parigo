import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestId } from "@/lib/harvest/api";
import { assertSameOrigin } from "@/lib/harvest/session";
import { createHarvestShortUrl } from "@/lib/harvest/short-url";
import { SITE_URL } from "@/lib/seo";
import { logEvent } from "@/lib/logger";

const schema = z.object({ path: z.string().min(1).max(800) });

function canonicalTrackUrl(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("INVALID_SHARE_PATH");
  const url = new URL(path, SITE_URL);
  if (url.origin !== SITE_URL || !/^\/(?:en\/)?albums\/[^/]+$/.test(url.pathname)) throw new Error("INVALID_SHARE_PATH");
  const trackId = url.searchParams.get("track")?.trim();
  if (!trackId || url.searchParams.getAll("track").length !== 1) throw new Error("INVALID_SHARE_PATH");
  const canonical = new URL(url.pathname, SITE_URL);
  canonical.searchParams.set("track", trackId);
  return canonical.toString();
}

export async function POST(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const canonicalUrl = canonicalTrackUrl(input.path);
    try {
      const url = await createHarvestShortUrl(canonicalUrl);
      return NextResponse.json({ data: { url, shortened: true }, meta: { requestId: id } }, { headers: { "Cache-Control": "no-store", "X-Request-ID": id } });
    } catch (error) {
      logEvent({ level: "warn", message: "short_url_fallback", route: "getshorturl", requestId: id, code: error instanceof Error ? error.name : "UNKNOWN" });
      return NextResponse.json({ data: { url: canonicalUrl, shortened: false }, meta: { requestId: id } }, { headers: { "Cache-Control": "no-store", "X-Request-ID": id } });
    }
  } catch {
    return NextResponse.json({ error: { code: "VALIDATION_FAILED", message: "Lien de partage invalide.", retryable: false, requestId: id } }, { status: 400, headers: { "Cache-Control": "no-store", "X-Request-ID": id } });
  }
}
