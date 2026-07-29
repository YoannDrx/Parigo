import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getMemberTagsByTrack } from "@/lib/harvest/activity";
import { apiError, requestId } from "@/lib/harvest/api";
import { requireHarvestSession } from "@/lib/harvest/session";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestID = requestId();
  try {
    const session = await requireHarvestSession();
    const trackId = z.string().min(1).max(256).parse((await context.params).id);
    const tags = await getMemberTagsByTrack(session.memberToken, trackId);
    return NextResponse.json(
      { data: { tags }, meta: { total: tags.length, requestId: requestID } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error, requestID, { surface: "account" });
  }
}
