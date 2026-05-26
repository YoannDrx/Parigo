import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Get a single playlist by slug with tracks
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const playlist = await prisma.playlist.findUnique({
      where: { slug },
      include: {
        cover: { select: { path: true } },
        tracks: {
          orderBy: { order: "asc" },
          include: {
            track: {
              include: {
                album: {
                  include: {
                    cover: { select: { path: true } },
                    label: { select: { name: true, slug: true } },
                  },
                },
                genres: {
                  include: { genre: { select: { name: true, slug: true } } },
                },
                moods: {
                  include: { mood: { select: { name: true, slug: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!playlist || !playlist.isActive) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    // Calculate total duration
    const totalDuration = playlist.tracks.reduce(
      (acc, t) => acc + (t.track?.duration || 0),
      0
    );

    const formattedPlaylist = {
      id: playlist.id,
      slug: playlist.slug,
      title: playlist.title,
      description: playlist.description,
      cover: playlist.cover?.path || null,
      category: playlist.category,
      isFeatured: playlist.isFeatured,
      trackCount: playlist.tracks.length,
      totalDuration,
      tracks: playlist.tracks
        .filter((t) => t.track && t.track.isActive)
        .map((t) => ({
          track: {
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
          },
          album: {
            id: t.track.album?.id || "",
            title: t.track.album?.title || "",
            cover: t.track.album?.cover?.path || "/images/placeholder-album.jpg",
            label: t.track.album?.label?.name || "",
            labelSlug: t.track.album?.label?.slug || "",
            trackCount: 0,
            genres: [],
          },
        })),
    };

    return NextResponse.json({ playlist: formattedPlaylist });
  } catch (error) {
    console.error("Error fetching playlist:", error);
    return NextResponse.json(
      { error: "Failed to fetch playlist" },
      { status: 500 }
    );
  }
}
