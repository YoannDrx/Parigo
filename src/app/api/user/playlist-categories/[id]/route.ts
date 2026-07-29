import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  removeMemberPlaylistCategory,
  updateMemberPlaylistCategory,
} from "@/lib/harvest/activity";
import { apiError, requestId } from "@/lib/harvest/api";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";

const inputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestID = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const categoryId = z.string().min(1).max(256).parse((await context.params).id);
    const category = await updateMemberPlaylistCategory(
      session.memberToken,
      categoryId,
      inputSchema.parse(await request.json()),
    );
    return NextResponse.json(
      { data: { updated: true, category }, meta: { requestId: requestID } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error, requestID, { surface: "account" });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestID = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const categoryId = z.string().min(1).max(256).parse((await context.params).id);
    await removeMemberPlaylistCategory(session.memberToken, categoryId);
    return NextResponse.json(
      { data: { removed: true }, meta: { requestId: requestID } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error, requestID, { surface: "account" });
  }
}
