import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { moveMemberPlaylistToCategory } from "@/lib/harvest/activity";
import { apiError, requestId } from "@/lib/harvest/api";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestID = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const playlistId = z.string().min(1).max(256).parse((await context.params).id);
    const input = z.object({
      categoryId: z.string().max(256),
      orderId: z.number().int().min(0).optional(),
    }).parse(await request.json());
    await moveMemberPlaylistToCategory(
      session.memberToken,
      playlistId,
      input.categoryId,
      input.orderId,
    );
    return NextResponse.json(
      { data: { updated: true }, meta: { requestId: requestID } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error, requestID, { surface: "account" });
  }
}
