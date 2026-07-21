import { NextRequest, NextResponse } from "next/server";
import { apiError, apiLabel, requestId } from "@/lib/harvest/api";
import { getLabels } from "@/lib/harvest/catalog";

export async function GET(request: NextRequest) {
  const id = requestId();
  try {
    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || 100), 200);
    const offset = Math.max(Number(request.nextUrl.searchParams.get("offset") || 0), 0);
    const all = await getLabels();
    return NextResponse.json(
      {
        data: { labels: all.slice(offset, offset + limit).map(apiLabel) },
        meta: { total: all.length, page: Math.floor(offset / limit) + 1, pageSize: limit, requestId: id },
      },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200", "X-Request-ID": id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
