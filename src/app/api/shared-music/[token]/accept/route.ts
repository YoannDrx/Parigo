import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { acceptSharedMusic } from "@/lib/harvest/activity";
import { apiError, requestId } from "@/lib/harvest/api";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";

const tokenSchema = z.string().min(8).max(2048);
const inputSchema = z.object({ acceptType: z.enum(["AsCollaboration", "AsCopy"]) });

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const token = tokenSchema.parse((await context.params).token);
    const { acceptType } = inputSchema.parse(await request.json());
    const acceptance = await acceptSharedMusic(session.memberToken, token, acceptType);
    return NextResponse.json(
      { data: { acceptance }, meta: { requestId: id } },
      { headers: { "Cache-Control": "no-store", "X-Request-ID": id } },
    );
  } catch (error) {
    return apiError(error, id, { surface: "account" });
  }
}
