import { NextResponse } from "next/server";
import { apiError, requestId } from "@/lib/harvest/api";
import { getFavouriteTracks } from "@/lib/harvest/activity";
import { requireHarvestSession } from "@/lib/harvest/session";

export async function GET() {
  const id = requestId();
  try {
    const session = await requireHarvestSession();
    const tracks = await getFavouriteTracks(session.memberToken);
    return NextResponse.json({ data: {
      trackIds: tracks.map((track) => track.id),
      albumIds: [...new Set(tracks.map((track) => track.albumId).filter(Boolean))],
    }, meta: { requestId: id } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}
