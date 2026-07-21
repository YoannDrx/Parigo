import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requestId } from "@/lib/harvest/api";
import { loginMember } from "@/lib/harvest/member";
import { assertSameOrigin, publicSession, setHarvestSession } from "@/lib/harvest/session";

const schema = z.object({ email: z.email(), password: z.string().min(8) });

export async function POST(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const result = await loginMember(input.email, input.password);
    await setHarvestSession(result);
    return NextResponse.json(
      { data: { session: publicSession({ ...result, user: result.profile }) }, meta: { requestId: id } },
      { headers: { "Cache-Control": "no-store", "X-Request-ID": id } },
    );
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}
