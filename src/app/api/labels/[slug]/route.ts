import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Get a single label by slug with its albums
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const label = await prisma.label.findUnique({
      where: { slug },
      include: {
        logo: { select: { path: true } },
        albums: {
          where: { isActive: true },
          include: {
            cover: { select: { path: true } },
            genres: {
              include: { genre: { select: { name: true, slug: true } } },
            },
            _count: { select: { tracks: true } },
          },
          orderBy: { releaseDate: "desc" },
        },
        _count: {
          select: {
            albums: { where: { isActive: true } },
          },
        },
      },
    });

    if (!label || !label.isActive) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    // Calculate total track count
    const trackCount = await prisma.track.count({
      where: {
        album: { labelId: label.id },
        isActive: true,
      },
    });

    const formattedLabel = {
      id: label.id,
      slug: label.slug,
      name: label.name,
      description: label.description,
      logo: label.logo?.path || null,
      website: label.website,
      albumCount: label._count.albums,
      trackCount,
      albums: label.albums.map((album) => ({
        id: album.id,
        slug: album.slug,
        title: album.title,
        cover: album.cover?.path || "/images/placeholder-album.jpg",
        label: label.name,
        labelSlug: label.slug,
        genres: album.genres.map((g) => g.genre.name),
        trackCount: album._count.tracks,
        releaseDate: album.releaseDate?.toISOString().split("T")[0],
      })),
    };

    return NextResponse.json({ label: formattedLabel });
  } catch (error) {
    console.error("Error fetching label:", error);
    return NextResponse.json(
      { error: "Failed to fetch label" },
      { status: 500 }
    );
  }
}
