import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiPlaylist, apiTrack, requestId } from "@/lib/harvest/api";
import { getSharedMusic } from "@/lib/harvest/activity";

const tokenSchema = z.string().min(8).max(2048);

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const id = requestId();
  try {
    const token = tokenSchema.parse((await context.params).token);
    const playlists = await getSharedMusic(token);
    return NextResponse.json({
      data: {
        playlists: playlists.map((playlist) => ({
          ...apiPlaylist(playlist),
          tracks: playlist.tracks?.map(apiTrack) || [],
        })),
      },
      meta: { requestId: id },
    }, { headers: { "Cache-Control": "private, no-store", "X-Request-ID": id } });
  } catch (error) {
    return apiError(error, id);
  }
}
