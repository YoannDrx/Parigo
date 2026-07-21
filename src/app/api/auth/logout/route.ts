import { NextResponse } from "next/server";
import { apiError, requestId } from "@/lib/harvest/api";
import { expireMember } from "@/lib/harvest/member";
import { assertSameOrigin, clearHarvestSession, readHarvestSession } from "@/lib/harvest/session";

export async function POST(request: Request) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const session = await readHarvestSession({ refresh: false });
    if (session) await expireMember(session.memberToken, session.persistentToken);
    await clearHarvestSession();
    return NextResponse.json({ data: { loggedOut: true }, meta: { requestId: id } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await clearHarvestSession();
    return apiError(error, id, { surface: "account" });
  }
}
