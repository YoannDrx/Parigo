import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const category = searchParams.get("category");
    const featured = searchParams.get("featured") === "true";

    const where: Record<string, unknown> = {
      isActive: true,
      isPublic: true,
    };

    if (category) {
      where.category = category;
    }

    if (featured) {
      where.isFeatured = true;
    }

    const [playlists, total] = await Promise.all([
      prisma.playlist.findMany({
        where,
        include: {
          cover: {
            select: {
              path: true,
            },
          },
          _count: {
            select: {
              tracks: true,
            },
          },
        },
        orderBy: { order: "asc" },
        take: limit,
        skip: offset,
      }),
      prisma.playlist.count({ where }),
    ]);

    const transformedPlaylists = playlists.map((playlist) => ({
      id: playlist.id,
      slug: playlist.slug,
      title: playlist.title,
      description: playlist.description,
      cover: playlist.cover?.path || "/images/placeholder-playlist.jpg",
      category: playlist.category,
      trackCount: playlist._count.tracks,
      isFeatured: playlist.isFeatured,
    }));

    return NextResponse.json({
      playlists: transformedPlaylists,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching playlists:", error);
    return NextResponse.json(
      { error: "Failed to fetch playlists" },
      { status: 500 }
    );
  }
}
