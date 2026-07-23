import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiTrack, requestId } from "@/lib/harvest/api";
import { suggestPlaylistTracks } from "@/lib/harvest/activity";
import { requireHarvestSession } from "@/lib/harvest/session";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestID = requestId();
  try {
    const session = await requireHarvestSession();
    const playlistId = z.string().min(1).max(256).parse((await context.params).id);
    const limit = z.coerce.number().int().min(1).max(24).default(12).parse(request.nextUrl.searchParams.get("limit") || undefined);
    const tracks = await suggestPlaylistTracks(session.memberToken, playlistId, limit);
    return NextResponse.json({ data: { tracks: tracks.map(apiTrack) }, meta: { total: tracks.length, requestId: requestID } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, requestID, { surface: "account" }); }
}
