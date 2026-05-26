import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const moods = await prisma.mood.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        color: true,
      },
    });

    return NextResponse.json({ moods });
  } catch (error) {
    console.error("Error fetching moods:", error);
    return NextResponse.json(
      { error: "Failed to fetch moods" },
      { status: 500 }
    );
  }
}
