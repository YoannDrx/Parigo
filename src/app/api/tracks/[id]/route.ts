import { NextResponse } from "next/server";
import { apiError, requestId } from "@/lib/harvest/api";
import { getTrack } from "@/lib/harvest/catalog";
import { getCachedTrack } from "@/lib/harvest/catalog-cache";
import { readHarvestSession } from "@/lib/harvest/session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId();
  try {
    const { id: trackId } = await params;
    const session = await readHarvestSession();
    const track = session
      ? await getTrack(trackId, session.memberToken)
      : await getCachedTrack(trackId);
    return NextResponse.json({ data: { track }, meta: { requestId: id } }, { headers: { "Cache-Control": session ? "no-store" : "public, s-maxage=300, stale-while-revalidate=900", "X-Request-ID": id } });
  } catch (error) {
    return apiError(error, id);
  }
}
