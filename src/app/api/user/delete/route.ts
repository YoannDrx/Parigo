import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requestId } from "@/lib/harvest/api";
import { memberRequest } from "@/lib/harvest/client";
import { buildMemberRemoval } from "@/lib/harvest/member-contracts";
import { assertSameOrigin, clearHarvestSession, requireHarvestSession } from "@/lib/harvest/session";

const deletionSchema = z.object({
  password: z.string().min(1).max(512),
}).strict();

export async function DELETE(request: Request) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const input = deletionSchema.parse(await request.json());
    await memberRequest(session.memberToken, (token) => `/removememberverifypassword/${token}`, {
      method: "POST",
      body: JSON.stringify(buildMemberRemoval(input.password, true)),
    });
    await clearHarvestSession();
    return NextResponse.json({ data: { closed: true }, meta: { requestId: id } }, { headers: { "Cache-Control": "no-store", "X-Request-ID": id } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}
