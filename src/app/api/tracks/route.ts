import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const albumId = searchParams.get("albumId");
    const query = searchParams.get("q");
    const genreSlugs = searchParams.get("genres")?.split(",").filter(Boolean) || [];
    const genreSlug = searchParams.get("genre");
    const moodSlugs = searchParams.get("moods")?.split(",").filter(Boolean) || [];
    const moodSlug = searchParams.get("mood");
    const instrumentSlugs = searchParams.get("instruments")?.split(",").filter(Boolean) || [];
    const instrumentSlug = searchParams.get("instrument");
    const minBpm = searchParams.get("minBpm");
    const maxBpm = searchParams.get("maxBpm");
    const minDuration = searchParams.get("minDuration");
    const maxDuration = searchParams.get("maxDuration");
    const isVocal = searchParams.get("isVocal");
    const labelSlug = searchParams.get("label");
    const sort = searchParams.get("sort") || "relevance";

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      isActive: true,
      album: {
        isActive: true,
        ...(labelSlug ? { label: { slug: labelSlug } } : {}),
      },
    };

    const orderBy = sort === "recent"
      ? [{ album: { releaseDate: "desc" as const } }, { trackNumber: "asc" as const }]
      : sort === "title"
        ? [{ title: "asc" as const }]
        : sort === "bpm-asc"
          ? [{ bpm: "asc" as const }, { title: "asc" as const }]
          : sort === "bpm-desc"
            ? [{ bpm: "desc" as const }, { title: "asc" as const }]
            : sort === "duration-asc"
              ? [{ duration: "asc" as const }, { title: "asc" as const }]
              : sort === "duration-desc"
                ? [{ duration: "desc" as const }, { title: "asc" as const }]
                : [{ album: { order: "asc" as const } }, { trackNumber: "asc" as const }];

    // Text search
    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { album: { title: { contains: query, mode: "insensitive" } } },
        { genres: { some: { genre: { name: { contains: query, mode: "insensitive" } } } } },
        { moods: { some: { mood: { name: { contains: query, mode: "insensitive" } } } } },
      ];
    }

    if (albumId) {
      where.albumId = albumId;
    }

    // Support both single genre and multiple genres
    const allGenreSlugs = genreSlug ? [...genreSlugs, genreSlug] : genreSlugs;
    if (allGenreSlugs.length > 0) {
      where.genres = {
        some: {
          genre: { slug: { in: allGenreSlugs } },
        },
      };
    }

    // Support both single mood and multiple moods
    const allMoodSlugs = moodSlug ? [...moodSlugs, moodSlug] : moodSlugs;
    if (allMoodSlugs.length > 0) {
      where.moods = {
        some: {
          mood: { slug: { in: allMoodSlugs } },
        },
      };
    }

    // Support both single instrument and multiple instruments
    const allInstrumentSlugs = instrumentSlug ? [...instrumentSlugs, instrumentSlug] : instrumentSlugs;
    if (allInstrumentSlugs.length > 0) {
      where.instruments = {
        some: {
          instrument: { slug: { in: allInstrumentSlugs } },
        },
      };
    }

    if (minBpm || maxBpm) {
      where.bpm = {};
      if (minBpm) (where.bpm as Record<string, number>).gte = parseInt(minBpm);
      if (maxBpm) (where.bpm as Record<string, number>).lte = parseInt(maxBpm);
    }

    if (minDuration || maxDuration) {
      where.duration = {};
      if (minDuration)
        (where.duration as Record<string, number>).gte = parseInt(minDuration);
      if (maxDuration)
        (where.duration as Record<string, number>).lte = parseInt(maxDuration);
    }

    if (isVocal !== null && isVocal !== undefined) {
      where.isVocal = isVocal === "true";
    }

    const [tracks, total] = await Promise.all([
      prisma.track.findMany({
        where,
        include: {
          album: {
            select: {
              id: true,
              title: true,
              slug: true,
              cover: {
                select: {
                  path: true,
                },
              },
              label: {
                select: {
                  name: true,
                  slug: true,
                },
              },
            },
          },
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
                  color: true,
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
                  color: true,
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
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.track.count({ where }),
    ]);

    const transformedTracks = tracks.map((track) => ({
      id: track.id,
      slug: track.slug,
      title: track.title,
      duration: track.duration,
      bpm: track.bpm,
      key: track.key,
      isVocal: track.isVocal,
      audioUrl: track.audio?.path || track.previewUrl || null,
      waveform: track.waveform as number[] | null,
      albumId: track.album.id,
      albumTitle: track.album.title,
      albumSlug: track.album.slug,
      albumCover: track.album.cover?.path || "/images/placeholder-album.jpg",
      albumLabel: track.album.label?.name,
      albumLabelSlug: track.album.label?.slug,
      genres: track.genres.map((g) => g.genre.name),
      moods: track.moods.map((m) => m.mood.name),
      instruments: track.instruments.map((i) => i.instrument.name),
    }));

    return NextResponse.json({
      tracks: transformedTracks,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching tracks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracks" },
      { status: 500 }
    );
  }
}
