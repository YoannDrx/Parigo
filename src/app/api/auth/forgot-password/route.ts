import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requestId } from "@/lib/harvest/api";
import { serviceRequest } from "@/lib/harvest/client";
import { assertSameOrigin } from "@/lib/harvest/session";
import { buildPasswordResetEmail } from "@/lib/harvest/member-contracts";

export async function POST(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const { email } = z.object({ email: z.email() }).parse(await request.json());
    await serviceRequest((token) => `/sendpasswordresetemail/${token}`, {
      method: "POST",
      body: JSON.stringify(buildPasswordResetEmail(email)),
    }).catch(() => undefined);
    return NextResponse.json({ data: { accepted: true }, meta: { requestId: id } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}
