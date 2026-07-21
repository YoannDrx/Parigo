import { NextRequest, NextResponse } from "next/server";
import { apiError, apiTrack, requestId } from "@/lib/harvest/api";
import { getAlbum } from "@/lib/harvest/catalog";

export async function GET(request: NextRequest) {
  const id = requestId();
  try {
    const params = request.nextUrl.searchParams;
    const limit = Math.min(Number(params.get("limit") || 30), 100);
    const offset = Math.max(Number(params.get("offset") || 0), 0);
    const albumId = params.get("albumId");
    if (albumId) {
      const result = await getAlbum(albumId);
      const tracks = result.album.tracks.slice(offset, offset + limit);
      return NextResponse.json({
        data: { tracks: tracks.map(apiTrack) },
        meta: {
          page: Math.floor(offset / limit) + 1,
          pageSize: limit,
          total: result.album.tracks.length,
          requestId: id,
        },
      });
    }

    return NextResponse.json({
      error: {
        code: "VALIDATION_FAILED",
        message: "Catalogue search moved to /api/search",
        retryable: false,
        requestId: id,
      },
    }, { status: 400, headers: { "X-Request-ID": id } });
  } catch (error) {
    return apiError(error, id);
  }
}
