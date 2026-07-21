import { NextResponse } from "next/server";
import { apiAlbum, apiError, apiTrack, requestId } from "@/lib/harvest/api";
import { getAlbum } from "@/lib/harvest/catalog";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestIdValue = requestId();
  try {
    const { id } = await params;
    const result = await getAlbum(id);
    return NextResponse.json(
      {
        data: { album: { ...apiAlbum(result.album), tracks: result.album.tracks.map(apiTrack) }, similarAlbums: result.similar.map(apiAlbum) },
        meta: { requestId: requestIdValue },
      },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900", "X-Request-ID": requestIdValue } },
    );
  } catch (error) {
    return apiError(error, requestIdValue);
  }
}
