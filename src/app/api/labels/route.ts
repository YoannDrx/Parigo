import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where = {
      isActive: true,
    };

    const [labels, total] = await Promise.all([
      prisma.label.findMany({
        where,
        include: {
          logo: {
            select: {
              path: true,
            },
          },
          _count: {
            select: {
              albums: true,
            },
          },
        },
        orderBy: { order: "asc" },
        take: limit,
        skip: offset,
      }),
      prisma.label.count({ where }),
    ]);

    const transformedLabels = labels.map((label) => ({
      id: label.id,
      slug: label.slug,
      name: label.name,
      description: label.description,
      logo: label.logo?.path || "/images/placeholder-label.jpg",
      website: label.website,
      albumCount: label._count.albums,
    }));

    return NextResponse.json({
      labels: transformedLabels,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching labels:", error);
    return NextResponse.json(
      { error: "Failed to fetch labels" },
      { status: 500 }
    );
  }
}
