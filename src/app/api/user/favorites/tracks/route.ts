import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addFavourite, getFavouriteTracks, removeFavouriteTrack } from "@/lib/harvest/activity";
import { apiError, apiTrack, requestId } from "@/lib/harvest/api";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";

const inputSchema = z.object({ trackId: z.string().min(1) });

export async function GET() {
  const id = requestId();
  try {
    const session = await requireHarvestSession();
    const tracks = await getFavouriteTracks(session.memberToken);
    return NextResponse.json({ data: { tracks: tracks.map(apiTrack) }, meta: { total: tracks.length, requestId: id } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}

export async function POST(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const { trackId } = inputSchema.parse(await request.json());
    await addFavourite(session.memberToken, "Track", trackId);
    return NextResponse.json({ data: { added: true, trackId }, meta: { requestId: id } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}

export async function DELETE(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const { trackId } = inputSchema.parse(await request.json());
    await removeFavouriteTrack(session.memberToken, trackId);
    return NextResponse.json({ data: { removed: true, trackId }, meta: { requestId: id } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}
