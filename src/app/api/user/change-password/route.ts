import { NextRequest, NextResponse } from "next/server";
import { apiError, requestId } from "@/lib/harvest/api";
import { serviceRequest } from "@/lib/harvest/client";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";
import { buildPasswordResetEmail } from "@/lib/harvest/member-contracts";

export async function POST(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    await serviceRequest((token) => `/sendpasswordresetemail/${token}`, {
      method: "POST",
      body: JSON.stringify(buildPasswordResetEmail(session.user.email)),
    });
    return NextResponse.json({ data: { resetEmailSent: true }, meta: { requestId: id } }, { headers: { "Cache-Control": "no-store", "X-Request-ID": id } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}
