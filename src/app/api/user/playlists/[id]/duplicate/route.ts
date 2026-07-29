import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { duplicateMemberPlaylist } from "@/lib/harvest/activity";
import { apiError, apiPlaylist, requestId } from "@/lib/harvest/api";
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
    const { name } = z.object({
      name: z.string().trim().min(1).max(160).optional(),
    }).parse(await request.json().catch(() => ({})));
    const playlist = await duplicateMemberPlaylist(session.memberToken, playlistId, name);
    return NextResponse.json(
      { data: { playlist: apiPlaylist(playlist) }, meta: { requestId: requestID } },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error, requestID, { surface: "account" });
  }
}
