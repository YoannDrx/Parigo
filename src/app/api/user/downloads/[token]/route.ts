import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requestId } from "@/lib/harvest/api";
import { getDownloadInfo, mapDownloadInfo } from "@/lib/harvest/activity";
import { requireHarvestSession } from "@/lib/harvest/session";
import { HarvestError } from "@/lib/harvest/errors";

const tokenSchema = z.string().min(1).max(2048);

export async function GET(_request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const id = requestId();
  try {
    await requireHarvestSession();
    const token = tokenSchema.parse((await context.params).token);
    if (token.toLowerCase() === "status") {
      throw new HarvestError("Grouped download status is not configured", "NOT_FOUND", 404);
    }
    const info = mapDownloadInfo(await getDownloadInfo(token));
    return NextResponse.json({ data: info, meta: { requestId: id } }, {
      headers: { "Cache-Control": "no-store", "X-Request-ID": id },
    });
  } catch (error) {
    return apiError(error, id, { surface: "account" });
  }
}
