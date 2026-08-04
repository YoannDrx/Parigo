import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requestId } from "@/lib/harvest/api";
import { serviceRequest } from "@/lib/harvest/client";
import { assertSameOrigin } from "@/lib/harvest/session";
import { buildPasswordResetEmail } from "@/lib/harvest/member-contracts";
import { logEvent } from "@/lib/logger";
import { HarvestError } from "@/lib/harvest/errors";

export async function POST(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const { email } = z.object({ email: z.email() }).parse(await request.json());
    let deliveryConfigured = true;
    await serviceRequest((token) => `/sendpasswordresetemail/${token}`, {
      method: "POST",
      body: JSON.stringify(buildPasswordResetEmail(email)),
    }).catch((error: unknown) => {
      if (error instanceof HarvestError && /required route|route not found/i.test(error.message)) {
        deliveryConfigured = false;
      }
      logEvent({
        level: "warn",
        message: "password_reset_email_failed",
        route: "api/auth/forgot-password",
        requestId: id,
        code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
      });
    });
    return NextResponse.json({ data: { accepted: true, deliveryConfigured }, meta: { requestId: id } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}
