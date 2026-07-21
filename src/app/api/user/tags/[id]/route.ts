import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { removeMemberTag, updateMemberTag } from "@/lib/harvest/activity";
import { apiError, requestId } from "@/lib/harvest/api";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";

const idSchema = z.string().min(1).max(256);

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestID = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const id = idSchema.parse((await context.params).id);
    const { name } = z.object({ name: z.string().trim().min(1).max(120) }).parse(await request.json());
    const tag = await updateMemberTag(session.memberToken, id, name);
    return NextResponse.json({ data: { tag }, meta: { requestId: requestID } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, requestID, { surface: "account" }); }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestID = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const id = idSchema.parse((await context.params).id);
    await removeMemberTag(session.memberToken, id);
    return NextResponse.json({ data: { removed: true }, meta: { requestId: requestID } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, requestID, { surface: "account" }); }
}
