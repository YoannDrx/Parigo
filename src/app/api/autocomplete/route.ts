import { NextRequest, NextResponse } from "next/server";
import { apiError, requestId } from "@/lib/harvest/api";
import { guestRequest } from "@/lib/harvest/client";
import { buildAutocompletePayload, mapAutocompleteResponse } from "@/lib/harvest/autocomplete";

export async function GET(request: NextRequest) {
  const id = requestId();
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim() || "";
    if (query.length < 2) return NextResponse.json({ data: { groups: [] }, meta: { requestId: id } });
    const payload = await guestRequest<Record<string, unknown>>(
      (token) => `/autocomplete/${token}`,
      { method: "POST", body: JSON.stringify(buildAutocompletePayload(query)) },
    );
    const groups = mapAutocompleteResponse(payload);
    return NextResponse.json(
      { data: { groups }, meta: { requestId: id } },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) { return apiError(error, id); }
}
