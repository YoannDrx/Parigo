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
    const { playlistId, trackIds } = z.object({
      playlistId: z.string().min(1),
      trackIds: z.array(z.string().min(1)).max(500).refine(
        (ids) => new Set(ids).size === ids.length,
        "trackIds must be unique",
      ),
    }).parse(await request.json());
    const playlist = await copyFeaturedPlaylist(session.memberToken, playlistId, trackIds);
    return NextResponse.json({ data: { copied: true, playlist: apiPlaylist(playlist) }, meta: { requestId: id } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}
