import { NextResponse } from "next/server";
import { apiError, apiPlaylist, apiTrack, requestId } from "@/lib/harvest/api";
import { getPlaylist } from "@/lib/harvest/catalog";
import { readHarvestSession } from "@/lib/harvest/session";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const id = requestId();
  try {
    const { slug } = await params;
    const session = await readHarvestSession();
    const playlist = await getPlaylist(slug, session?.memberToken);
    const tracks = playlist.tracks.map(apiTrack);
    return NextResponse.json(
      {
        data: { playlist: {
          ...apiPlaylist(playlist),
          description: playlist.description || null,
          category: playlist.category || null,
          totalDuration: playlist.tracks.reduce((sum, track) => sum + track.duration, 0),
          tracks,
        } },
        meta: { requestId: id },
      },
      { headers: { "Cache-Control": session ? "no-store" : "public, s-maxage=600, stale-while-revalidate=1800", "X-Request-ID": id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
