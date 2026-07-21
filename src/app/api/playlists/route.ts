import { NextRequest, NextResponse } from "next/server";
import { apiError, apiPlaylist, requestId } from "@/lib/harvest/api";
import { getPlaylists } from "@/lib/harvest/catalog";

export async function GET(request: NextRequest) {
  const id = requestId();
  try {
    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || 100), 100);
    const offset = Math.max(Number(request.nextUrl.searchParams.get("offset") || 0), 0);
    const result = await getPlaylists({ limit, offset, style: request.nextUrl.searchParams.get("category") || undefined });
    return NextResponse.json(
      {
        data: { playlists: result.items.map(apiPlaylist) },
        meta: { total: result.total, page: Math.floor(offset / limit) + 1, pageSize: limit, requestId: id },
      },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800", "X-Request-ID": id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
