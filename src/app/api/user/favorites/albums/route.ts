import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-utils";

// GET - Get all favorite albums for the current user
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const favorites = await prisma.favoriteAlbum.findMany({
      where: { userId: session.user.id },
      include: {
        album: {
          include: {
            cover: { select: { path: true } },
            label: { select: { name: true, slug: true } },
            genres: {
              include: { genre: { select: { name: true, slug: true } } },
            },
            _count: { select: { tracks: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const albums = favorites.map((fav) => ({
      id: fav.album.id,
      slug: fav.album.slug,
      title: fav.album.title,
      cover: fav.album.cover?.path || "/images/placeholder-album.jpg",
      label: fav.album.label?.name || "Unknown",
      labelSlug: fav.album.label?.slug || "",
      genres: fav.album.genres.map((g) => ({ name: g.genre.name, slug: g.genre.slug })),
      trackCount: fav.album._count.tracks,
      favoritedAt: fav.createdAt,
    }));

    return NextResponse.json({ albums, total: albums.length });
  } catch (error) {
    console.error("Error fetching favorite albums:", error);
    return NextResponse.json(
      { error: "Failed to fetch favorites" },
      { status: 500 }
    );
  }
}

// POST - Add an album to favorites
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { albumId } = await request.json();

    if (!albumId) {
      return NextResponse.json(
        { error: "Album ID is required" },
        { status: 400 }
      );
    }

    // Check if album exists
    const album = await prisma.album.findUnique({
      where: { id: albumId },
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    // Check if already favorited
    const existing = await prisma.favoriteAlbum.findUnique({
      where: {
        userId_albumId: {
          userId: session.user.id,
          albumId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Album already in favorites" },
        { status: 409 }
      );
    }

    // Add to favorites
    await prisma.favoriteAlbum.create({
      data: {
        userId: session.user.id,
        albumId,
      },
    });

    return NextResponse.json({ success: true, albumId });
  } catch (error) {
    console.error("Error adding favorite album:", error);
    return NextResponse.json(
      { error: "Failed to add favorite" },
      { status: 500 }
    );
  }
}

// DELETE - Remove an album from favorites
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { albumId } = await request.json();

    if (!albumId) {
      return NextResponse.json(
        { error: "Album ID is required" },
        { status: 400 }
      );
    }

    // Delete from favorites
    await prisma.favoriteAlbum.delete({
      where: {
        userId_albumId: {
          userId: session.user.id,
          albumId,
        },
      },
    });

    return NextResponse.json({ success: true, albumId });
  } catch (error) {
    console.error("Error removing favorite album:", error);
    return NextResponse.json(
      { error: "Failed to remove favorite" },
      { status: 500 }
    );
  }
}
