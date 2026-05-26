import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const letter = searchParams.get("letter"); // Filter by first letter

    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (letter) {
      where.name = {
        startsWith: letter.toUpperCase(),
        mode: "insensitive",
      };
    }

    const [artists, total] = await Promise.all([
      prisma.artist.findMany({
        where,
        include: {
          image: {
            select: {
              path: true,
            },
          },
          links: {
            orderBy: { order: "asc" },
          },
          _count: {
            select: {
              albumCredits: true,
              trackCredits: true,
            },
          },
        },
        orderBy: { name: "asc" },
        take: limit,
        skip: offset,
      }),
      prisma.artist.count({ where }),
    ]);

    const transformedArtists = artists.map((artist) => ({
      id: artist.id,
      slug: artist.slug,
      name: artist.name,
      bio: artist.bio,
      image: artist.image?.path || "/images/placeholder-artist.jpg",
      links: artist.links.map((link) => ({
        platform: link.platform,
        url: link.url,
        label: link.label,
      })),
      albumCount: artist._count.albumCredits,
      trackCount: artist._count.trackCredits,
    }));

    return NextResponse.json({
      artists: transformedArtists,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching artists:", error);
    return NextResponse.json(
      { error: "Failed to fetch artists" },
      { status: 500 }
    );
  }
}
