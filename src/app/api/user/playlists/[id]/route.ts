import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiPlaylist, apiTrack, requestId } from "@/lib/harvest/api";
import { getMemberPlaylist, removeMemberPlaylist, updateMemberPlaylist } from "@/lib/harvest/activity";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";

const idSchema = z.string().min(1).max(256);
const updateSchema = z.object({ title: z.string().min(1).max(160), description: z.string().max(1000).optional() });

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestID = requestId();
  try {
    const session = await requireHarvestSession();
    const id = idSchema.parse((await context.params).id);
    const playlist = await getMemberPlaylist(session.memberToken, id);
    if (!playlist) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Playlist not found", retryable: false, requestId: requestID } }, { status: 404 });
    return NextResponse.json({ data: { playlist: { ...apiPlaylist(playlist), tracks: playlist.tracks?.map(apiTrack) || [] } }, meta: { requestId: requestID } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, requestID, { surface: "account" }); }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestID = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const id = idSchema.parse((await context.params).id);
    await updateMemberPlaylist(session.memberToken, id, updateSchema.parse(await request.json()));
    return NextResponse.json({ data: { updated: true }, meta: { requestId: requestID } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, requestID, { surface: "account" }); }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestID = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const id = idSchema.parse((await context.params).id);
    await removeMemberPlaylist(session.memberToken, id);
    return NextResponse.json({ data: { removed: true }, meta: { requestId: requestID } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, requestID, { surface: "account" }); }
}
