import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiPlaylist, requestId } from "@/lib/harvest/api";
import { createMemberPlaylist, getMemberPlaylists, removeMemberPlaylist } from "@/lib/harvest/activity";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";

const createSchema = z.object({ title: z.string().min(1).max(160), description: z.string().max(1000).optional(), isPublic: z.boolean().optional() });

export async function GET() {
  const id = requestId();
  try {
    const session = await requireHarvestSession();
    const playlists = await getMemberPlaylists(session.memberToken);
    return NextResponse.json({
      data: { playlists: playlists.map((playlist) => ({ ...apiPlaylist(playlist), isPublic: false, createdAt: playlist.createdAt || new Date().toISOString() })) },
      meta: { total: playlists.length, requestId: id },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}

export async function POST(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const input = createSchema.parse(await request.json());
    const playlist = await createMemberPlaylist(session.memberToken, input);
    return NextResponse.json({ data: { playlist: playlist ? apiPlaylist(playlist) : null }, meta: { requestId: id } }, { status: 201 });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}

export async function DELETE(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const { playlistId } = z.object({ playlistId: z.string().min(1) }).parse(await request.json());
    await removeMemberPlaylist(session.memberToken, playlistId);
    return NextResponse.json({ data: { removed: true }, meta: { requestId: id } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}
