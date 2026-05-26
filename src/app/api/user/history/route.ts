import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-utils";

// GET - Get listening history for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const history = await prisma.listeningHistory.findMany({
      where: { userId: session.user.id },
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
      orderBy: { playedAt: "desc" },
      take: limit,
      skip: offset,
    });

    const formattedHistory = history.map((entry) => ({
      id: entry.id,
      playedAt: entry.playedAt,
      duration: entry.duration,
      completed: entry.completed,
      track: {
        id: entry.track.id,
        title: entry.track.title,
        duration: entry.track.duration,
        bpm: entry.track.bpm,
        waveform: entry.track.waveform,
        genres: entry.track.genres.map((g) => ({ name: g.genre.name })),
        moods: entry.track.moods.map((m) => ({ name: m.mood.name })),
        album: entry.track.album
          ? {
              id: entry.track.album.id,
              title: entry.track.album.title,
              cover:
                entry.track.album.cover?.path ||
                "/images/placeholder-album.jpg",
            }
          : undefined,
      },
    }));

    const total = await prisma.listeningHistory.count({
      where: { userId: session.user.id },
    });

    return NextResponse.json({
      history: formattedHistory,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}

// POST - Log a new listening entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { trackId, duration, completed } = await request.json();

    if (!trackId) {
      return NextResponse.json(
        { error: "Track ID is required" },
        { status: 400 }
      );
    }

    // Verify track exists
    const track = await prisma.track.findUnique({
      where: { id: trackId },
    });

    if (!track) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    // Create history entry
    const entry = await prisma.listeningHistory.create({
      data: {
        userId: session.user.id,
        trackId,
        duration: duration || 0,
        completed: completed || false,
      },
    });

    // Update track play count
    await prisma.track.update({
      where: { id: trackId },
      data: { playCount: { increment: 1 } },
    });

    return NextResponse.json({ success: true, entryId: entry.id });
  } catch (error) {
    console.error("Error logging history:", error);
    return NextResponse.json(
      { error: "Failed to log history" },
      { status: 500 }
    );
  }
}

// DELETE - Clear all listening history
export async function DELETE() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.listeningHistory.deleteMany({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing history:", error);
    return NextResponse.json(
      { error: "Failed to clear history" },
      { status: 500 }
    );
  }
}
