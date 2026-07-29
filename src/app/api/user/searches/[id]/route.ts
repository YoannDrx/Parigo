import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateMemberSavedSearch } from "@/lib/harvest/activity";
import { apiError, requestId } from "@/lib/harvest/api";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";

const idSchema = z.string().min(1).max(256);
const updateSchema = z.object({ name: z.string().trim().min(1).max(160) });

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestID = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const searchId = idSchema.parse((await context.params).id);
    const { name } = updateSchema.parse(await request.json());
    const search = await updateMemberSavedSearch(
      session.memberToken,
      searchId,
      name,
      session.memberUtcOffsetHours,
    );
    return NextResponse.json(
      { data: { updated: true, search }, meta: { requestId: requestID } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error, requestID, { surface: "account" });
  }
}
