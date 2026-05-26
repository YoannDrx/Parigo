import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type"); // all, albums, tracks, artists

    if (!query || query.length < 2) {
      return NextResponse.json({
        albums: [],
        tracks: [],
        artists: [],
        total: 0,
      });
    }

    const searchTerm = `%${query}%`;

    const results: {
      albums: unknown[];
      tracks: unknown[];
      artists: unknown[];
    } = {
      albums: [],
      tracks: [],
      artists: [],
    };

    // Search albums
    if (!type || type === "all" || type === "albums") {
      const albums = await prisma.album.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            {
              artists: {
                some: {
                  artist: { name: { contains: query, mode: "insensitive" } },
                },
              },
            },
          ],
        },
        include: {
          label: {
            select: { name: true, slug: true },
          },
          cover: {
            select: { path: true },
          },
          genres: {
            include: {
              genre: {
                select: { name: true, slug: true, color: true },
              },
            },
          },
          artists: {
            include: {
              artist: {
                select: { name: true, slug: true },
              },
            },
          },
          _count: {
            select: { tracks: true },
          },
        },
        take: type === "albums" ? limit : 5,
        orderBy: { order: "asc" },
      });

      results.albums = albums.map((album) => ({
        id: album.id,
        slug: album.slug,
        title: album.title,
        cover: album.cover?.path || "/images/placeholder-album.jpg",
        label: album.label?.name || "Parigo",
        genres: album.genres.map((g) => g.genre.name),
        artists: album.artists.map((a) => a.artist.name),
        trackCount: album._count.tracks,
      }));
    }

    // Search tracks
    if (!type || type === "all" || type === "tracks") {
      const tracks = await prisma.track.findMany({
        where: {
          isActive: true,
          album: { isActive: true },
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            {
              genres: {
                some: {
                  genre: { name: { contains: query, mode: "insensitive" } },
                },
              },
            },
            {
              moods: {
                some: {
                  mood: { name: { contains: query, mode: "insensitive" } },
                },
              },
            },
          ],
        },
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
            include: {
              genre: { select: { name: true } },
            },
          },
          moods: {
            include: {
              mood: { select: { name: true } },
            },
          },
        },
        take: type === "tracks" ? limit : 10,
        orderBy: { playCount: "desc" },
      });

      results.tracks = tracks.map((track) => ({
        id: track.id,
        slug: track.slug,
        title: track.title,
        duration: track.duration,
        bpm: track.bpm,
        isVocal: track.isVocal,
        audioUrl: track.audio?.path || track.previewUrl || null,
        waveform: track.waveform,
        albumId: track.album.id,
        albumTitle: track.album.title,
        albumSlug: track.album.slug,
        albumCover: track.album.cover?.path || "/images/placeholder-album.jpg",
        genres: track.genres.map((g) => g.genre.name),
        moods: track.moods.map((m) => m.mood.name),
      }));
    }

    // Search artists
    if (!type || type === "all" || type === "artists") {
      const artists = await prisma.artist.findMany({
        where: {
          isActive: true,
          name: { contains: query, mode: "insensitive" },
        },
        include: {
          image: { select: { path: true } },
          _count: {
            select: { albumCredits: true, trackCredits: true },
          },
        },
        take: type === "artists" ? limit : 5,
        orderBy: { order: "asc" },
      });

      results.artists = artists.map((artist) => ({
        id: artist.id,
        slug: artist.slug,
        name: artist.name,
        image: artist.image?.path || "/images/placeholder-artist.jpg",
        albumCount: artist._count.albumCredits,
        trackCount: artist._count.trackCredits,
      }));
    }

    return NextResponse.json({
      ...results,
      total:
        results.albums.length + results.tracks.length + results.artists.length,
      query,
    });
  } catch (error) {
    console.error("Error searching:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
