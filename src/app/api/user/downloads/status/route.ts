import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDownloadPreparationInfo } from "@/lib/harvest/activity";
import { apiError, requestId } from "@/lib/harvest/api";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";

const identifierSchema = z.union([
  z.object({ downloadId: z.string().min(1).max(256) }),
  z.object({ downloadGroupId: z.string().min(1).max(256) }),
]);

export async function POST(request: NextRequest) {
  const requestID = requestId();
  try {
    assertSameOrigin(request);
    await requireHarvestSession();
    const input = z.object({
      identifier: identifierSchema,
      skip: z.number().int().min(0).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }).parse(await request.json());
    const result = await getDownloadPreparationInfo(input.identifier, input.skip, input.limit);
    return NextResponse.json(
      { data: result, meta: { total: result.total, requestId: requestID } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error, requestID, { surface: "account" });
  }
}
