import { NextRequest, NextResponse } from "next/server";
import { apiAlbum, apiError, requestId } from "@/lib/harvest/api";
import { getAlbums } from "@/lib/harvest/catalog";

export async function GET(request: NextRequest) {
  const id = requestId();
  try {
    const params = request.nextUrl.searchParams;
    const limit = Math.min(Number(params.get("limit") || 30), 100);
    const offset = Math.max(Number(params.get("offset") || 0), 0);
    const categories = [params.get("categories"), params.get("genres"), params.get("moods"), params.get("instruments"), params.get("genre")]
      .flatMap((value) => value?.split(",") || [])
      .filter(Boolean);
    const result = await getAlbums({
      limit,
      offset,
      label: params.get("label") || undefined,
      style: params.get("style") || params.get("genre") || undefined,
      category: params.get("category") || undefined,
      categories: categories.length ? categories : undefined,
      query: params.get("q") || undefined,
      featured: params.get("featured") === "true",
      sort: params.get("sort") || undefined,
    });
    return NextResponse.json(
      {
        data: { albums: result.items.map(apiAlbum) },
        meta: { total: result.total, page: Math.floor(offset / limit) + 1, pageSize: limit, requestId: id },
      },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900", "X-Request-ID": id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
