import { NextResponse } from "next/server";
import { apiError, requestId } from "@/lib/harvest/api";
import { getDownloadFormats } from "@/lib/harvest/assets";

export async function GET() {
  const id = requestId();
  try {
    const formats = await getDownloadFormats();
    return NextResponse.json(
      { data: { formats }, meta: { requestId: id } },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400", "X-Request-ID": id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
