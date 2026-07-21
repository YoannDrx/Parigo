import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requestId } from "@/lib/harvest/api";
import { registerMember } from "@/lib/harvest/member";
import { assertSameOrigin } from "@/lib/harvest/session";

const schema = z.object({
  email: z.email(),
  password: z.string().min(8).max(200),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  country: z.string().trim().min(2).max(100),
  company: z.string().max(160).optional(),
  production: z.string().max(160).optional(),
  subProduction: z.string().max(160).optional(),
  position: z.string().max(160).optional(),
  address1: z.string().max(200).optional(),
  address2: z.string().max(200).optional(),
  suburb: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  postcode: z.string().max(30).optional(),
  phone: z.string().max(60).optional(),
  fileFormatId: z.string().max(120).optional(),
  subscribe: z.boolean().optional(),
  termsAccepted: z.literal(true),
  privacyAccepted: z.literal(true),
});

export async function POST(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const result = await registerMember(input);
    return NextResponse.json(
      { data: { registered: true, verificationRequired: true, verificationEmailSent: result.verificationEmailSent }, meta: { requestId: id } },
      { status: 201, headers: { "Cache-Control": "no-store", "X-Request-ID": id } },
    );
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}
