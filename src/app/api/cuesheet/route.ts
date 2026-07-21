import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requestId } from "@/lib/harvest/api";
import { createCueSheet } from "@/lib/harvest/activity";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";

const schema = z.object({ filename: z.string().min(1).max(120), trackIds: z.array(z.string().min(1)).min(1).max(500) });

export async function POST(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const input = schema.parse(await request.json());
    const url = await createCueSheet(session.memberToken, input.filename, input.trackIds);
    return NextResponse.json({ data: { url }, meta: { requestId: id } }, { headers: { "Cache-Control": "no-store", "X-Request-ID": id } });
  } catch (error) {
    return apiError(error, id);
  }
}
