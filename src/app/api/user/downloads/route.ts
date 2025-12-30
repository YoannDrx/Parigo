import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-utils";

// GET - Get all downloads for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const downloads = await prisma.download.findMany({
      where: { userId: session.user.id },
      include: {
        track: {
          include: {
            album: {
              include: {
                cover: { select: { path: true } },
              },
            },
          },
        },
      },
      orderBy: { downloadedAt: "desc" },
      take: limit,
      skip: offset,
    });

    const formattedDownloads = downloads.map((download) => ({
      id: download.id,
      downloadedAt: download.downloadedAt,
      licenseType: download.licenseType,
      projectName: download.projectName,
      track: {
        id: download.track.id,
        title: download.track.title,
        duration: download.track.duration,
        album: download.track.album
          ? {
              id: download.track.album.id,
              title: download.track.album.title,
              cover:
                download.track.album.cover?.path ||
                "/images/placeholder-album.jpg",
            }
          : undefined,
      },
    }));

    const total = await prisma.download.count({
      where: { userId: session.user.id },
    });

    return NextResponse.json({
      downloads: formattedDownloads,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error("Error fetching downloads:", error);
    return NextResponse.json(
      { error: "Failed to fetch downloads" },
      { status: 500 }
    );
  }
}

// POST - Log a new download
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { trackId, licenseType, projectName } = await request.json();

    if (!trackId) {
      return NextResponse.json(
        { error: "Track ID is required" },
        { status: 400 }
      );
    }

    if (!licenseType) {
      return NextResponse.json(
        { error: "License type is required" },
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

    // Create download entry
    const download = await prisma.download.create({
      data: {
        userId: session.user.id,
        trackId,
        licenseType,
        projectName: projectName || null,
      },
    });

    return NextResponse.json({ success: true, downloadId: download.id });
  } catch (error) {
    console.error("Error logging download:", error);
    return NextResponse.json(
      { error: "Failed to log download" },
      { status: 500 }
    );
  }
}
