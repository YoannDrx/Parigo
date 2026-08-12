import { NextResponse } from "next/server";
import { requestId } from "@/lib/harvest/api";
import { getSearchCapabilities } from "@/lib/search/providers";

export async function GET() {
  const id = requestId();
  return NextResponse.json(
    { data: getSearchCapabilities(), meta: { requestId: id } },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "X-Request-ID": id,
      },
    },
  );
}
