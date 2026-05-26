import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Get a single artist by slug with discography
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const artist = await prisma.artist.findUnique({
      where: { slug },
      include: {
        image: { select: { path: true } },
        links: {
          orderBy: { order: "asc" },
        },
        albumCredits: {
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
        },
        trackCredits: {
          include: {
            track: {
              include: {
                album: {
                  include: {
                    cover: { select: { path: true } },
                  },
                },
                genres: {
                  include: { genre: { select: { name: true } } },
                },
                moods: {
                  include: { mood: { select: { name: true } } },
                },
              },
            },
          },
          take: 20,
        },
      },
    });

    if (!artist || !artist.isActive) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    // Count albums and tracks
    const albumCount = artist.albumCredits.length;
    const trackCount = await prisma.trackArtist.count({
      where: { artistId: artist.id },
    });

    const formattedArtist = {
      id: artist.id,
      slug: artist.slug,
      name: artist.name,
      bio: artist.bio,
      image: artist.image?.path || null,
      links: artist.links.map((link) => ({
        id: link.id,
        platform: link.platform,
        url: link.url,
        label: link.label,
      })),
      albumCount,
      trackCount,
      albums: artist.albumCredits.map((a) => ({
        id: a.album.id,
        slug: a.album.slug,
        title: a.album.title,
        cover: a.album.cover?.path || "/images/placeholder-album.jpg",
        label: a.album.label?.name || "Unknown",
        labelSlug: a.album.label?.slug || "",
        genres: a.album.genres.map((g) => g.genre.name),
        trackCount: a.album._count.tracks,
        releaseDate: a.album.releaseDate?.toISOString().split("T")[0],
      })),
      featuredTracks: artist.trackCredits.map((t) => ({
        id: t.track.id,
        slug: t.track.slug,
        title: t.track.title,
        duration: t.track.duration,
        bpm: t.track.bpm,
        waveform: t.track.waveform,
        genres: t.track.genres.map((g) => g.genre.name),
        moods: t.track.moods.map((m) => m.mood.name),
        instruments: [],
        isVocal: t.track.isVocal,
        audioUrl: t.track.previewUrl,
        albumId: t.track.albumId,
        albumTitle: t.track.album?.title,
        albumCover: t.track.album?.cover?.path || "/images/placeholder-album.jpg",
      })),
    };

    return NextResponse.json({ artist: formattedArtist });
  } catch (error) {
    console.error("Error fetching artist:", error);
    return NextResponse.json(
      { error: "Failed to fetch artist" },
      { status: 500 }
    );
  }
}
