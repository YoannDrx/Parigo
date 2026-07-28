import { NextRequest, NextResponse } from "next/server";
import { apiError, requestId } from "@/lib/harvest/api";
import { guestRequest } from "@/lib/harvest/client";
import { buildAutocompletePayload, mapAutocompleteResponse } from "@/lib/harvest/autocomplete";

export async function GET(request: NextRequest) {
  const id = requestId();
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim() || "";
    const view = request.nextUrl.searchParams.get("view") === "albums" ? "albums" : "tracks";
    if (query.length < 2) return NextResponse.json({ data: { groups: [] }, meta: { requestId: id } });
    const autocomplete = (keyword: string) => guestRequest<Record<string, unknown>>(
      (token) => `/autocomplete/${token}`,
      { method: "POST", body: JSON.stringify(buildAutocompletePayload(keyword, view)) },
    );
    const payload = await autocomplete(query);
    const groups = mapAutocompleteResponse(payload).filter((group) => group.key === view);
    return NextResponse.json(
      { data: { groups }, meta: { requestId: id } },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) { return apiError(error, id); }
}
