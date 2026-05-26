import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-utils";

// GET - Get all playlists for current user
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const playlists = await prisma.playlist.findMany({
      where: { userId: session.user.id },
      include: {
        cover: { select: { path: true } },
        _count: { select: { tracks: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedPlaylists = playlists.map((playlist) => ({
      id: playlist.id,
      slug: playlist.slug,
      title: playlist.title,
      description: playlist.description,
      cover: playlist.cover?.path || "/images/placeholder-playlist.jpg",
      trackCount: playlist._count.tracks,
      isPublic: playlist.isPublic,
      createdAt: playlist.createdAt,
    }));

    return NextResponse.json({
      playlists: formattedPlaylists,
      total: formattedPlaylists.length,
    });
  } catch (error) {
    console.error("Error fetching playlists:", error);
    return NextResponse.json(
      { error: "Failed to fetch playlists" },
      { status: 500 }
    );
  }
}

// POST - Create a new playlist
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, isPublic } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Generate slug from title
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Ensure unique slug
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.playlist.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const playlist = await prisma.playlist.create({
      data: {
        slug,
        title,
        description: description || "",
        isPublic: isPublic ?? false,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      playlist: {
        id: playlist.id,
        slug: playlist.slug,
        title: playlist.title,
        description: playlist.description,
        isPublic: playlist.isPublic,
      },
    });
  } catch (error) {
    console.error("Error creating playlist:", error);
    return NextResponse.json(
      { error: "Failed to create playlist" },
      { status: 500 }
    );
  }
}
