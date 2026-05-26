import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-utils";

// GET - Get all favorite IDs for the current user (for quick checking)
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [favoriteTracks, favoriteAlbums, favoritePlaylists] = await Promise.all([
      prisma.favoriteTrack.findMany({
        where: { userId: session.user.id },
        select: { trackId: true },
      }),
      prisma.favoriteAlbum.findMany({
        where: { userId: session.user.id },
        select: { albumId: true },
      }),
      prisma.favoritePlaylist.findMany({
        where: { userId: session.user.id },
        select: { playlistId: true },
      }),
    ]);

    return NextResponse.json({
      trackIds: favoriteTracks.map((f) => f.trackId),
      albumIds: favoriteAlbums.map((f) => f.albumId),
      playlistIds: favoritePlaylists.map((f) => f.playlistId),
    });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json(
      { error: "Failed to fetch favorites" },
      { status: 500 }
    );
  }
}
