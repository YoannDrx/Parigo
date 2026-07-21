import { NextRequest, NextResponse } from "next/server";
import { apiError, requestId } from "@/lib/harvest/api";
import { getCategories } from "@/lib/harvest/catalog";

export async function GET(request: NextRequest) {
  const id = requestId();
  try {
    const language = request.nextUrl.searchParams.get("language") === "fr" ? "fr" : "en";
    const groups = await getCategories(language);
    return NextResponse.json({ data: { groups }, meta: { total: groups.length, requestId: id } }, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200", "X-Request-ID": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}
