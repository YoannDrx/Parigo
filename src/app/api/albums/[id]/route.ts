import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Find album by id or slug
    const album = await prisma.album.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        isActive: true,
      },
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
        tracks: {
          where: { isActive: true },
          include: {
            audio: {
              select: {
                path: true,
              },
            },
            genres: {
              include: {
                genre: {
                  select: {
                    name: true,
                    slug: true,
                  },
                },
              },
            },
            moods: {
              include: {
                mood: {
                  select: {
                    name: true,
                    slug: true,
                  },
                },
              },
            },
            instruments: {
              include: {
                instrument: {
                  select: {
                    name: true,
                    slug: true,
                  },
                },
              },
            },
            artists: {
              include: {
                artist: {
                  select: {
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
          orderBy: [{ trackNumber: "asc" }, { order: "asc" }],
        },
      },
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    // Get similar albums (same genre)
    const mainGenreId = album.genres[0]?.genre.id;
    let similarAlbumsData: Array<{
      id: string;
      slug: string;
      title: string;
      label: { name: string; slug: string } | null;
      cover: { path: string } | null;
      genres: Array<{ genre: { name: string; slug: string; color: string | null } }>;
      _count: { tracks: number };
    }> = [];

    if (mainGenreId) {
      similarAlbumsData = await prisma.album.findMany({
        where: {
          isActive: true,
          id: { not: album.id },
          genres: {
            some: {
              genreId: mainGenreId,
            },
          },
        },
        select: {
          id: true,
          slug: true,
          title: true,
          label: {
            select: {
              name: true,
              slug: true,
            },
          },
          cover: {
            select: {
              path: true,
            },
          },
          genres: {
            include: {
              genre: {
                select: {
                  name: true,
                  slug: true,
                  color: true,
                },
              },
            },
          },
          _count: {
            select: {
              tracks: true,
            },
          },
        },
        take: 6,
        orderBy: { order: "asc" },
      });
    }

    // Transform for frontend
    const transformedAlbum = {
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
      trackCount: album.tracks.length,
      tracks: album.tracks.map((track) => ({
        id: track.id,
        slug: track.slug,
        title: track.title,
        duration: track.duration,
        bpm: track.bpm,
        key: track.key,
        isVocal: track.isVocal,
        audioUrl: track.audio?.path || track.previewUrl || null,
        waveform: track.waveform as number[] | null,
        trackNumber: track.trackNumber,
        genres: track.genres.map((g) => g.genre.name),
        moods: track.moods.map((m) => m.mood.name),
        instruments: track.instruments.map((i) => i.instrument.name),
        artists: track.artists.map((a) => ({
          name: a.artist.name,
          slug: a.artist.slug,
        })),
        // Album info for player
        albumId: album.id,
        albumTitle: album.title,
        albumSlug: album.slug,
        albumCover: album.cover?.path || "/images/placeholder-album.jpg",
      })),
    };

    const transformedSimilar = similarAlbumsData.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      cover: a.cover?.path || "/images/placeholder-album.jpg",
      label: a.label?.name || "Parigo",
      genres: a.genres.map((g) => ({
        name: g.genre.name,
        slug: g.genre.slug,
      })),
      trackCount: a._count.tracks,
    }));

    return NextResponse.json({
      album: transformedAlbum,
      similarAlbums: transformedSimilar,
    });
  } catch (error) {
    console.error("Error fetching album:", error);
    return NextResponse.json(
      { error: "Failed to fetch album" },
      { status: 500 }
    );
  }
}
