import { NextResponse } from "next/server";
import { assetUrl, getAssetTemplates } from "@/lib/harvest/assets";
import { apiError, requestId } from "@/lib/harvest/api";
import { HarvestError } from "@/lib/harvest/errors";
import { normalizeWaveform } from "@/lib/harvest/waveform";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId();
  try {
    const { id: trackId } = await params;
    const templates = await getAssetTemplates();
    if (!templates.waveformData) throw new HarvestError("Waveform service is unavailable", "HARVEST_UNAVAILABLE", 503, true);
    const response = await fetch(assetUrl(templates.waveformData, { id: trackId, dataformat: "json" }), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new HarvestError("Waveform is unavailable", "NOT_FOUND", 404);
    const waveform = normalizeWaveform(await response.json());
    return NextResponse.json(
      { waveform, samples: waveform.length, meta: { requestId: id } },
      { headers: { "Cache-Control": "public, s-maxage=259200, stale-while-revalidate=86400", "X-Request-ID": id } },
    );
  } catch (error) { return apiError(error, id); }
}
