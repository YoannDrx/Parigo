import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requestId } from "@/lib/harvest/api";
import { getMemberProfile, subscribeMember, updateMemberProfile } from "@/lib/harvest/member";
import { assertSameOrigin, requireHarvestSession, setHarvestSession } from "@/lib/harvest/session";

export async function GET() {
  const id = requestId();
  try {
    const session = await requireHarvestSession();
    const profile = await getMemberProfile(session.memberToken);
    return NextResponse.json({ data: { profile }, meta: { requestId: id } }, { headers: { "Cache-Control": "no-store", "X-Request-ID": id } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}

const updateSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  company: z.string().max(160).optional(),
  country: z.string().max(100).optional(),
  production: z.string().max(160).optional(),
  subProduction: z.string().max(160).optional(),
  position: z.string().max(160).optional(),
  address1: z.string().max(200).optional(),
  address2: z.string().max(200).optional(),
  suburb: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  postcode: z.string().max(30).optional(),
  phone: z.string().max(60).optional(),
  website: z.string().max(300).optional(),
  fileFormatId: z.string().max(120).optional(),
  subscribed: z.boolean().optional(),
});

export async function PUT(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const input = updateSchema.parse(await request.json());
    const { subscribed, ...profileInput } = input;
    if (Object.values(profileInput).some((value) => value !== undefined)) {
      await updateMemberProfile(session.memberToken, profileInput);
    }
    if (subscribed !== undefined) await subscribeMember(session.memberToken, subscribed);
    const profile = await getMemberProfile(session.memberToken);
    await setHarvestSession({
      ...session,
      user: {
        id: profile.id,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        status: profile.status,
        image: profile.image,
        createdAt: profile.createdAt,
      },
    });
    return NextResponse.json({ data: { profile }, meta: { requestId: id } }, { headers: { "Cache-Control": "no-store", "X-Request-ID": id } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}
