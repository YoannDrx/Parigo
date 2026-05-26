import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-utils";

// GET - Get all favorite tracks for the current user
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const favorites = await prisma.favoriteTrack.findMany({
      where: { userId: session.user.id },
      include: {
        track: {
          include: {
            album: {
              select: {
                id: true,
                title: true,
                slug: true,
                cover: { select: { path: true } },
              },
            },
            audio: { select: { path: true } },
            genres: {
              include: { genre: { select: { name: true, slug: true } } },
            },
            moods: {
              include: { mood: { select: { name: true, slug: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const tracks = favorites.map((fav) => ({
      id: fav.track.id,
      slug: fav.track.slug,
      title: fav.track.title,
      duration: fav.track.duration,
      bpm: fav.track.bpm,
      key: fav.track.key,
      isVocal: fav.track.isVocal,
      audioUrl: fav.track.audio?.path || fav.track.previewUrl || null,
      waveform: fav.track.waveform as number[] | null,
      albumId: fav.track.album.id,
      albumTitle: fav.track.album.title,
      albumSlug: fav.track.album.slug,
      albumCover: fav.track.album.cover?.path || "/images/placeholder-album.jpg",
      genres: fav.track.genres.map((g) => g.genre.name),
      moods: fav.track.moods.map((m) => m.mood.name),
      favoritedAt: fav.createdAt,
    }));

    return NextResponse.json({ tracks, total: tracks.length });
  } catch (error) {
    console.error("Error fetching favorite tracks:", error);
    return NextResponse.json(
      { error: "Failed to fetch favorites" },
      { status: 500 }
    );
  }
}

// POST - Add a track to favorites
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { trackId } = await request.json();

    if (!trackId) {
      return NextResponse.json(
        { error: "Track ID is required" },
        { status: 400 }
      );
    }

    // Check if track exists
    const track = await prisma.track.findUnique({
      where: { id: trackId },
    });

    if (!track) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    // Check if already favorited
    const existing = await prisma.favoriteTrack.findUnique({
      where: {
        userId_trackId: {
          userId: session.user.id,
          trackId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Track already in favorites" },
        { status: 409 }
      );
    }

    // Add to favorites
    await prisma.favoriteTrack.create({
      data: {
        userId: session.user.id,
        trackId,
      },
    });

    return NextResponse.json({ success: true, trackId });
  } catch (error) {
    console.error("Error adding favorite track:", error);
    return NextResponse.json(
      { error: "Failed to add favorite" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a track from favorites
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { trackId } = await request.json();

    if (!trackId) {
      return NextResponse.json(
        { error: "Track ID is required" },
        { status: 400 }
      );
    }

    // Delete from favorites
    await prisma.favoriteTrack.delete({
      where: {
        userId_trackId: {
          userId: session.user.id,
          trackId,
        },
      },
    });

    return NextResponse.json({ success: true, trackId });
  } catch (error) {
    console.error("Error removing favorite track:", error);
    return NextResponse.json(
      { error: "Failed to remove favorite" },
      { status: 500 }
    );
  }
}
