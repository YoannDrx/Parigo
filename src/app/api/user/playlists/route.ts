import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiPlaylist, requestId } from "@/lib/harvest/api";
import {
  createMemberPlaylist,
  createMemberPlaylistWithTracks,
  getMemberPlaylists,
  removeMemberPlaylist,
} from "@/lib/harvest/activity";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";

const createSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(1000).optional(),
  trackIds: z.array(z.string().min(1).max(256)).min(1).max(500).optional(),
});

export async function GET() {
  const id = requestId();
  try {
    const session = await requireHarvestSession();
    const playlists = await getMemberPlaylists(session.memberToken);
    return NextResponse.json({
      data: { playlists: playlists.map(apiPlaylist) },
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
    const playlist = input.trackIds
      ? await createMemberPlaylistWithTracks(session.memberToken, {
          title: input.title,
          description: input.description,
          trackIds: input.trackIds,
        })
      : await createMemberPlaylist(session.memberToken, input);
    return NextResponse.json(
      {
        data: {
          playlist: apiPlaylist(playlist),
          ...(input.trackIds ? { updated: true, verified: true } : {}),
        },
        meta: { requestId: id },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) { return apiError(error, id, { surface: "account", operation: "playlist-create" }); }
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
