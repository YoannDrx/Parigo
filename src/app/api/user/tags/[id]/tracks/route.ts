import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addTracksToMemberTags, getMemberTagTracks, removeTrackFromMemberTag } from "@/lib/harvest/activity";
import { apiError, requestId } from "@/lib/harvest/api";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";

const mutationSchema = z.object({ action: z.enum(["add", "remove"]), trackIds: z.array(z.string().min(1).max(256)).min(1).max(500) });

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestID = requestId();
  try {
    const session = await requireHarvestSession();
    const id = z.string().min(1).parse((await context.params).id);
    const tracks = await getMemberTagTracks(session.memberToken, id);
    return NextResponse.json({ data: { tracks }, meta: { total: tracks.length, requestId: requestID } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, requestID, { surface: "account" }); }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestID = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const id = z.string().min(1).parse((await context.params).id);
    const input = mutationSchema.parse(await request.json());
    if (input.action === "add") await addTracksToMemberTags(session.memberToken, [id], input.trackIds);
    else await Promise.all(input.trackIds.map((trackId) => removeTrackFromMemberTag(session.memberToken, id, trackId)));
    const tracks = await getMemberTagTracks(session.memberToken, id);
    const remoteIds = new Set(tracks.map((track) => track.id));
    const verified = input.action === "add"
      ? input.trackIds.every((trackId) => remoteIds.has(trackId))
      : input.trackIds.every((trackId) => !remoteIds.has(trackId));
    return NextResponse.json({
      data: {
        updated: true,
        verified,
        tagId: id,
        trackIds: input.trackIds,
        trackCount: tracks.length,
      },
      meta: { requestId: requestID },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, requestID, { surface: "account" }); }
}
