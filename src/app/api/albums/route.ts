import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const labelSlug = searchParams.get("label");
    const genreSlug = searchParams.get("genre");
    const featured = searchParams.get("featured") === "true";
    const sort = searchParams.get("sort") || "order"; // order, releaseDate, title

    // Build where clause
    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (labelSlug) {
      where.label = { slug: labelSlug };
    }

    if (genreSlug) {
      where.genres = {
        some: {
          genre: { slug: genreSlug },
        },
      };
    }

    if (featured) {
      where.isFeatured = true;
    }

    // Build orderBy
    let orderBy: Record<string, string> = { order: "asc" };
    if (sort === "releaseDate") {
      orderBy = { releaseDate: "desc" };
    } else if (sort === "title") {
      orderBy = { title: "asc" };
    }

    const [albums, total] = await Promise.all([
      prisma.album.findMany({
        where,
        include: {
          label: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          cover: {
            select: {
              id: true,
              path: true,
              blurDataUrl: true,
            },
          },
          genres: {
            include: {
              genre: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  color: true,
                },
              },
            },
          },
          moods: {
            include: {
              mood: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  color: true,
                },
              },
            },
          },
          artists: {
            include: {
              artist: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
            orderBy: { order: "asc" },
          },
          _count: {
            select: {
              tracks: true,
            },
          },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.album.count({ where }),
    ]);

    // Transform albums for frontend
    const transformedAlbums = albums.map((album) => ({
      id: album.id,
      slug: album.slug,
      title: album.title,
      description: album.description,
      cover: album.cover?.path || "/images/placeholder-album.jpg",
      coverBlur: album.cover?.blurDataUrl,
      label: album.label?.name || "Parigo",
      labelSlug: album.label?.slug,
      releaseDate: album.releaseDate?.toISOString().split("T")[0],
      year: album.year,
      spotifyUrl: album.spotifyUrl,
      genres: album.genres.map((g) => ({
        name: g.genre.name,
        slug: g.genre.slug,
        color: g.genre.color,
      })),
      moods: album.moods.map((m) => ({
        name: m.mood.name,
        slug: m.mood.slug,
        color: m.mood.color,
      })),
      artists: album.artists.map((a) => ({
        name: a.artist.name,
        slug: a.artist.slug,
        role: a.role,
      })),
      trackCount: album._count.tracks,
      isFeatured: album.isFeatured,
    }));

    return NextResponse.json({
      albums: transformedAlbums,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching albums:", error);
    return NextResponse.json(
      { error: "Failed to fetch albums" },
      { status: 500 }
    );
  }
}
