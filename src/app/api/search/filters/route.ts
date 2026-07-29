import { NextRequest, NextResponse } from "next/server";
import { apiError, requestId } from "@/lib/harvest/api";
import { getSearchFilterGroups } from "@/lib/harvest/search-filters";

export async function GET(request: NextRequest) {
  const id = requestId();
  try {
    const language = request.nextUrl.searchParams.get("language") === "en" ? "en" : "fr";
    const groups = await getSearchFilterGroups(language);
    return NextResponse.json(
      { data: { groups }, meta: { requestId: id } },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
          "X-Request-ID": id,
        },
      },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
