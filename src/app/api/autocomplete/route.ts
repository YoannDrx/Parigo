import { NextRequest, NextResponse } from "next/server";
import { apiError, requestId } from "@/lib/harvest/api";
import { guestRequest } from "@/lib/harvest/client";
import { isRecord } from "@/lib/harvest/errors";

export async function GET(request: NextRequest) {
  const id = requestId();
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim() || "";
    if (query.length < 2) return NextResponse.json({ data: { suggestions: [] }, meta: { requestId: id } });
    const payload = await guestRequest<Record<string, unknown>>(
      (token) => `/autocomplete/${token}`,
      { method: "POST", body: JSON.stringify({ Keyword: query, SearchTerm: query, Limit: 10 }) },
    );
    const candidates = [payload.Suggestions, payload.Results, payload.Autocomplete]
      .find(Array.isArray) as unknown[] | undefined;
    const suggestions = (candidates || []).map((item) =>
      typeof item === "string"
        ? item
        : isRecord(item)
          ? String(item.Value || item.Name || item.Text || "")
          : "",
    ).filter(Boolean).slice(0, 10);
    return NextResponse.json(
      { data: { suggestions }, meta: { requestId: id } },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) { return apiError(error, id); }
}
