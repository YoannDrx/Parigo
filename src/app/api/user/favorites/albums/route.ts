import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addFavourite, getFavouriteTracks, removeFavouriteTrack } from "@/lib/harvest/activity";
import { apiError, requestId } from "@/lib/harvest/api";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";

const schema = z.object({ albumId: z.string().min(1) });

export async function GET() {
  const id = requestId();
  try {
    const session = await requireHarvestSession();
    const tracks = await getFavouriteTracks(session.memberToken);
    const grouped = new Map<string, typeof tracks>();
    for (const track of tracks) {
      if (!track.albumId) continue;
      grouped.set(track.albumId, [...(grouped.get(track.albumId) || []), track]);
    }
    const albums = [...grouped.entries()].map(([albumId, albumTracks]) => ({
      id: albumId,
      slug: albumId,
      title: albumTracks[0]?.albumTitle || "Album",
      cover: albumTracks[0]?.albumCover || "/images/placeholder-album.jpg",
      label: albumTracks[0]?.albumLabel || "Parigo",
      labelSlug: albumTracks[0]?.albumLabelSlug || "",
      genres: [...new Set(albumTracks.flatMap((track) => track.genres))],
      moods: [...new Set(albumTracks.flatMap((track) => track.moods))],
      trackCount: albumTracks.length,
    }));
    return NextResponse.json({ data: { albums }, meta: { total: albums.length, requestId: id } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}

export async function POST(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const { albumId } = schema.parse(await request.json());
    await addFavourite(session.memberToken, "Album", albumId);
    return NextResponse.json({ data: { added: true, albumId }, meta: { requestId: id } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}

export async function DELETE(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const { albumId } = schema.parse(await request.json());
    const tracks = await getFavouriteTracks(session.memberToken);
    await Promise.all(tracks.filter((track) => track.albumId === albumId).map((track) => removeFavouriteTrack(session.memberToken, track.id)));
    return NextResponse.json({ data: { removed: true, albumId }, meta: { requestId: id } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}
