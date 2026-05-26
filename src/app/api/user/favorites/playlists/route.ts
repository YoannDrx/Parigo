import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-utils";

// GET - Get all favorite playlists for the current user
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const favorites = await prisma.favoritePlaylist.findMany({
      where: { userId: session.user.id },
      include: {
        playlist: {
          include: {
            cover: { select: { path: true } },
            _count: { select: { tracks: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const playlists = favorites.map((fav) => ({
      id: fav.playlist.id,
      slug: fav.playlist.slug,
      title: fav.playlist.title,
      description: fav.playlist.description,
      cover: fav.playlist.cover?.path || "/images/placeholder-playlist.jpg",
      category: fav.playlist.category,
      trackCount: fav.playlist._count.tracks,
      favoritedAt: fav.createdAt,
    }));

    return NextResponse.json({ playlists, total: playlists.length });
  } catch (error) {
    console.error("Error fetching favorite playlists:", error);
    return NextResponse.json(
      { error: "Failed to fetch favorites" },
      { status: 500 }
    );
  }
}

// POST - Add a playlist to favorites
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { playlistId } = await request.json();

    if (!playlistId) {
      return NextResponse.json(
        { error: "Playlist ID is required" },
        { status: 400 }
      );
    }

    // Check if playlist exists
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    // Check if already favorited
    const existing = await prisma.favoritePlaylist.findUnique({
      where: {
        userId_playlistId: {
          userId: session.user.id,
          playlistId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Playlist already in favorites" },
        { status: 409 }
      );
    }

    // Add to favorites
    await prisma.favoritePlaylist.create({
      data: {
        userId: session.user.id,
        playlistId,
      },
    });

    return NextResponse.json({ success: true, playlistId });
  } catch (error) {
    console.error("Error adding favorite playlist:", error);
    return NextResponse.json(
      { error: "Failed to add favorite" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a playlist from favorites
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { playlistId } = await request.json();

    if (!playlistId) {
      return NextResponse.json(
        { error: "Playlist ID is required" },
        { status: 400 }
      );
    }

    // Delete from favorites
    await prisma.favoritePlaylist.delete({
      where: {
        userId_playlistId: {
          userId: session.user.id,
          playlistId,
        },
      },
    });

    return NextResponse.json({ success: true, playlistId });
  } catch (error) {
    console.error("Error removing favorite playlist:", error);
    return NextResponse.json(
      { error: "Failed to remove favorite" },
      { status: 500 }
    );
  }
}
