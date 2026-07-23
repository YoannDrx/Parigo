import { NextResponse } from "next/server";
import { z } from "zod";
import { getCachedAlbums } from "@/lib/harvest/catalog-cache";
import { renderUrlSet, unavailableSitemap, xmlResponse } from "@/lib/sitemap-xml";
const pageSchema = z.string().regex(/^\d+\.xml$/).transform((value) => Number(value.slice(0, -4)));

export async function GET(_request: Request, context: { params: Promise<{ page: string }> }) {
  const page = pageSchema.safeParse((await context.params).page);
  if (!page.success || page.data < 1) return new NextResponse("Not found", { status: 404 });
  try {
    const result = await getCachedAlbums({ limit: 100, offset: (page.data - 1) * 100 });
    return xmlResponse(renderUrlSet(result.items.map((album) => ({
      fr: `/albums/${album.id}`,
      en: `/en/albums/${album.id}`,
      lastModified: album.updatedAt || album.releaseDate,
      priority: 0.7,
    }))));
  } catch {
    return unavailableSitemap();
  }
}
