import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { copyFeaturedPlaylist } from "@/lib/harvest/activity";
import { apiError, apiPlaylist, requestId } from "@/lib/harvest/api";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";

export async function POST(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const { playlistId } = z.object({ playlistId: z.string().min(1) }).parse(await request.json());
    const playlist = await copyFeaturedPlaylist(session.memberToken, playlistId);
    return NextResponse.json({ data: { copied: true, playlist: apiPlaylist(playlist) }, meta: { requestId: id } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}
