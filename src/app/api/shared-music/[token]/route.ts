import { NextResponse } from "next/server";
import { z } from "zod";
import { getSharedMusic } from "@/lib/harvest/activity";
import { apiError, apiPlaylist, apiTrack, requestId } from "@/lib/harvest/api";

const tokenSchema = z.string().min(8).max(2048);

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const id = requestId();
  try {
    const token = tokenSchema.parse((await context.params).token);
    const shared = await getSharedMusic(token);
    return NextResponse.json({
      data: {
        playlists: shared.playlists.map((playlist) => ({
          ...apiPlaylist(playlist),
          tracks: playlist.tracks?.map(apiTrack) || [],
        })),
        allowCollaboration: shared.allowCollaboration,
      },
      meta: { requestId: id },
    }, { headers: { "Cache-Control": "private, no-store", "X-Request-ID": id } });
  } catch (error) {
    return apiError(error, id);
  }
}
