import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requestId } from "@/lib/harvest/api";
import { serviceRequest } from "@/lib/harvest/client";
import { assertSameOrigin, clearHarvestSession } from "@/lib/harvest/session";
import { buildPasswordUpdate } from "@/lib/harvest/member-contracts";

const schema = z.object({ token: z.string().min(1), password: z.string().min(8) });

export async function GET(request: NextRequest) {
  const id = requestId();
  try {
    const tokenValue = z.string().min(1).parse(request.nextUrl.searchParams.get("token"));
    await serviceRequest((token) => `/validatepasswordresettoken/${token}/${encodeURIComponent(tokenValue)}`);
    return NextResponse.json({ data: { valid: true }, meta: { requestId: id } }, { headers: { "Cache-Control": "no-store", "X-Request-ID": id } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}

export async function POST(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    await serviceRequest((token) => `/updatepasswordusingtoken/${token}`, {
      method: "POST",
      body: JSON.stringify(buildPasswordUpdate(input.token, input.password)),
    });
    await clearHarvestSession();
    return NextResponse.json({ data: { updated: true }, meta: { requestId: id } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}
