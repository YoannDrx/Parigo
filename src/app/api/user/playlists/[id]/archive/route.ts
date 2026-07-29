import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setMemberPlaylistArchived } from "@/lib/harvest/activity";
import { apiError, requestId } from "@/lib/harvest/api";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestID = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const playlistId = z.string().min(1).max(256).parse((await context.params).id);
    const { archived } = z.object({ archived: z.boolean() }).parse(await request.json());
    await setMemberPlaylistArchived(session.memberToken, playlistId, archived);
    return NextResponse.json(
      { data: { updated: true, archived }, meta: { requestId: requestID } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error, requestID, { surface: "account" });
  }
}
