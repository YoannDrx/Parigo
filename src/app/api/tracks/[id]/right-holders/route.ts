import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTrackRightHolders } from "@/lib/harvest/activity";
import { apiError, requestId } from "@/lib/harvest/api";
import { readHarvestSession } from "@/lib/harvest/session";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestID = requestId();
  try {
    const trackId = z.string().min(1).max(256).parse((await context.params).id);
    const session = await readHarvestSession();
    const rightHolders = await getTrackRightHolders(session?.memberToken, trackId);
    return NextResponse.json(
      { data: { rightHolders }, meta: { total: rightHolders.length, requestId: requestID } },
      {
        headers: {
          "Cache-Control": session
            ? "no-store"
            : "public, s-maxage=300, stale-while-revalidate=900",
        },
      },
    );
  } catch (error) {
    return apiError(error, requestID);
  }
}
