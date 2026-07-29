import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getMemberCommunications } from "@/lib/harvest/activity";
import { apiError, requestId } from "@/lib/harvest/api";
import { requireHarvestSession } from "@/lib/harvest/session";

export async function GET(request: NextRequest) {
  const requestID = requestId();
  try {
    const session = await requireHarvestSession();
    const input = z.object({
      skip: z.coerce.number().int().min(0).default(0),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }).parse(Object.fromEntries(request.nextUrl.searchParams));
    const communications = await getMemberCommunications(session.memberToken, input);
    return NextResponse.json(
      { data: communications, meta: { total: communications.total, requestId: requestID } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error, requestID, { surface: "account" });
  }
}
