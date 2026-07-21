import { NextResponse } from "next/server";
import { apiError, requestId } from "@/lib/harvest/api";
import { memberRequest } from "@/lib/harvest/client";
import { assertSameOrigin, clearHarvestSession, requireHarvestSession } from "@/lib/harvest/session";

export async function DELETE(request: Request) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    await memberRequest(session.memberToken, (token) => `/removemember/${token}`);
    await clearHarvestSession();
    return NextResponse.json({ data: { deleted: true }, meta: { requestId: id } }, { headers: { "Cache-Control": "no-store", "X-Request-ID": id } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}
