import { NextResponse } from "next/server";
import { requestId } from "@/lib/harvest/api";
import { getSearchCapabilities } from "@/lib/search/providers";
import { getAimsCapabilities } from "@/lib/harvest/aims";

export async function GET() {
  const id = requestId();
  const aims = await getAimsCapabilities().catch(() => undefined);
  return NextResponse.json(
    { data: getSearchCapabilities(Boolean(aims?.prompt.enabled)), meta: { requestId: id } },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "X-Request-ID": id,
      },
    },
  );
}
