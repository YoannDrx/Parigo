import { NextResponse } from "next/server";
import { getAimsCapabilities } from "@/lib/harvest/aims";
import { requestId } from "@/lib/harvest/api";
import { getHarvestApiConfig, isParigoSessionConfigured } from "@/lib/harvest/config";

export async function GET() {
  const id = requestId();
  const startedAt = Date.now();
  let catalogConfigured = true;
  try {
    getHarvestApiConfig();
  } catch {
    catalogConfigured = false;
  }
  const memberConfigured = isParigoSessionConfigured();
  if (!catalogConfigured) {
    return NextResponse.json({
      data: {
        status: "degraded",
        catalog: { configured: false, available: false },
        account: { configured: memberConfigured },
        remote: { available: false },
        durationMs: Date.now() - startedAt,
      },
      meta: { requestId: id },
    }, { status: 503, headers: { "Cache-Control": "no-store", "X-Request-ID": id } });
  }
  try {
    const aims = await getAimsCapabilities();
    return NextResponse.json({
      data: {
        status: "ok",
        catalog: { configured: true, available: true },
        account: { configured: memberConfigured },
        remote: { available: true },
        searchSimilar: aims.track.enabled,
        aims,
        durationMs: Date.now() - startedAt,
      },
      meta: { requestId: id },
    }, { headers: { "Cache-Control": "no-store", "X-Request-ID": id } });
  } catch {
    return NextResponse.json({
      data: {
        status: "degraded",
        catalog: { configured: true, available: false },
        account: { configured: memberConfigured },
        remote: { available: false },
        durationMs: Date.now() - startedAt,
      },
      meta: { requestId: id },
    }, { status: 503, headers: { "Cache-Control": "no-store", "X-Request-ID": id } });
  }
}
