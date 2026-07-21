import { NextResponse } from "next/server";
import { apiError, requestId } from "@/lib/harvest/api";
import { publicSession, readHarvestSession } from "@/lib/harvest/session";

export async function GET() {
  const id = requestId();
  try {
    return NextResponse.json(
      { data: { session: publicSession(await readHarvestSession()) }, meta: { requestId: id } },
      { headers: { "Cache-Control": "no-store", "X-Request-ID": id } },
    );
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}
