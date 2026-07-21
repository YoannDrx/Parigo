import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requestId } from "@/lib/harvest/api";
import { getDownloadHistory, requestDownload } from "@/lib/harvest/activity";
import { getDownloadFormats } from "@/lib/harvest/assets";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";

export async function GET(request: NextRequest) {
  const id = requestId();
  try {
    const session = await requireHarvestSession();
    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || 50), 100);
    const offset = Math.max(Number(request.nextUrl.searchParams.get("offset") || 0), 0);
    const downloads = await getDownloadHistory(session.memberToken, offset, limit);
    return NextResponse.json({
      data: { downloads },
      meta: { total: downloads.length, page: Math.floor(offset / limit) + 1, pageSize: limit, requestId: id },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}

const downloadSchema = z.object({
  trackId: z.string().optional(),
  trackIds: z.array(z.string()).optional(),
  formatId: z.string().optional(),
  includeVersions: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const input = downloadSchema.parse(await request.json());
    const trackIds = input.trackIds?.length ? input.trackIds : input.trackId ? [input.trackId] : [];
    if (!trackIds.length) return NextResponse.json({ error: { code: "VALIDATION_FAILED", message: "At least one track is required", retryable: false, requestId: id } }, { status: 400 });
    const formats = input.formatId ? [] : await getDownloadFormats();
    const formatId = input.formatId || formats.find((format) => format.extension === "MP3" && format.bitRate === 320)?.id || formats.find((format) => format.isDefault)?.id || formats[0]?.id;
    if (!formatId) return NextResponse.json({ error: { code: "INVALID_UPSTREAM_RESPONSE", message: "No download format is available", retryable: false, requestId: id } }, { status: 502 });
    return NextResponse.json({ data: await requestDownload(session.memberToken, { ...input, formatId, trackIds }), meta: { requestId: id } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}
