import { NextResponse } from "next/server";
import { z } from "zod";
import { getAlbums } from "@/lib/harvest/catalog";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.parigomusic.com";
const pageSchema = z.string().regex(/^\d+\.xml$/).transform((value) => Number(value.slice(0, -4)));

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;",
  })[character] || character);
}

export async function GET(_request: Request, context: { params: Promise<{ page: string }> }) {
  const page = pageSchema.safeParse((await context.params).page);
  if (!page.success || page.data < 1) return new NextResponse("Not found", { status: 404 });
  const result = await getAlbums({ limit: 100, offset: (page.data - 1) * 100 });
  const urls = result.items.map((album) => [
    "<url>",
    `<loc>${escapeXml(`${baseUrl}/albums/${album.id}`)}</loc>`,
    album.releaseDate ? `<lastmod>${escapeXml(album.releaseDate)}</lastmod>` : "",
    "<changefreq>monthly</changefreq>",
    "<priority>0.7</priority>",
    "</url>",
  ].join(""));
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`,
    { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
