import { NextRequest, NextResponse } from "next/server";
import { apiError, requestId } from "@/lib/harvest/api";
import { getAuditionHistory, historyTrackResponse } from "@/lib/harvest/activity";
import { requireHarvestSession } from "@/lib/harvest/session";

export async function GET(request: NextRequest) {
  const id = requestId();
  try {
    const session = await requireHarvestSession();
    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || 50), 100);
    const offset = Math.max(Number(request.nextUrl.searchParams.get("offset") || 0), 0);
    const history = await getAuditionHistory(session.memberToken, offset, limit);
    return NextResponse.json({
      data: { history: history.map((entry) => ({ ...entry, track: historyTrackResponse(entry.track) })) },
      meta: { total: history.length, page: Math.floor(offset / limit) + 1, pageSize: limit, requestId: id },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}

// The catalogue provider records auditions from its tracked stream URL; no duplicate local write is needed.
export async function POST() {
  return NextResponse.json({ data: { trackedBy: "catalogue" } });
}

export async function DELETE() {
  return NextResponse.json({ error: { code: "VALIDATION_FAILED", message: "Listening history cannot be cleared from the public service", retryable: false } }, { status: 405 });
}
