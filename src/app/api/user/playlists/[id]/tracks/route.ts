import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addTracksToPlaylist, getMemberPlaylist, removeTracksFromPlaylist, reorderPlaylistTracks } from "@/lib/harvest/activity";
import { apiError, requestId } from "@/lib/harvest/api";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";

const schema = z.object({ action: z.enum(["add", "remove", "reorder"]), trackIds: z.array(z.string().min(1)).min(1).max(500) });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestID = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const id = z.string().min(1).parse((await context.params).id);
    const input = schema.parse(await request.json());
    if (input.action === "add") {
      await addTracksToPlaylist(session.memberToken, id, input.trackIds);
      let playlist = await getMemberPlaylist(session.memberToken, id);
      let remoteIds = new Set(playlist?.tracks?.map((track) => track.id) ?? []);
      let missingTrackIds = input.trackIds.filter((trackId) => !remoteIds.has(trackId));
      for (const delay of [180, 360]) {
        if (!missingTrackIds.length) break;
        await new Promise((resolve) => setTimeout(resolve, delay));
        playlist = await getMemberPlaylist(session.memberToken, id);
        remoteIds = new Set(playlist?.tracks?.map((track) => track.id) ?? []);
        missingTrackIds = input.trackIds.filter((trackId) => !remoteIds.has(trackId));
      }
      return NextResponse.json({ data: { updated: true, verified: missingTrackIds.length === 0, missingTrackIds, playlistId: id }, meta: { requestId: requestID } }, { headers: { "Cache-Control": "no-store" } });
    }
    if (input.action === "remove") await removeTracksFromPlaylist(session.memberToken, id, input.trackIds);
    else await reorderPlaylistTracks(session.memberToken, id, input.trackIds);
    return NextResponse.json({ data: { updated: true, verified: true, playlistId: id }, meta: { requestId: requestID } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, requestID, { surface: "account" }); }
}
