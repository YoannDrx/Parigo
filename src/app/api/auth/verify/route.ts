import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requestId } from "@/lib/harvest/api";
import { serviceRequest } from "@/lib/harvest/client";

export async function GET(request: NextRequest) {
  const id = requestId();
  try {
    const verifyToken = z.string().min(1).parse(request.nextUrl.searchParams.get("token"));
    await serviceRequest((token) => `/validateverifymembertoken/${token}/${encodeURIComponent(verifyToken)}`);
    return NextResponse.json({ data: { valid: true }, meta: { requestId: id } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}

export async function POST(request: NextRequest) {
  const id = requestId();
  try {
    const { token: verifyToken } = z.object({ token: z.string().min(1) }).parse(await request.json());
    await serviceRequest((token) => `/validateverifymembertoken/${token}/${encodeURIComponent(verifyToken)}`);
    await serviceRequest((token) => `/verifymember/${token}`, {
      method: "POST",
      body: JSON.stringify({ Token: verifyToken }),
    });
    return NextResponse.json({ data: { verified: true, status: "pending approval" }, meta: { requestId: id } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}
