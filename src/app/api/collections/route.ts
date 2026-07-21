import { NextResponse } from "next/server";
import { apiError, requestId } from "@/lib/harvest/api";
import { getStyles } from "@/lib/harvest/catalog";

export async function GET() {
  const id = requestId();
  try {
    const collections = await getStyles();
    return NextResponse.json(
      { data: { collections }, meta: { total: collections.length, requestId: id } },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } },
    );
  } catch (error) { return apiError(error, id); }
}
