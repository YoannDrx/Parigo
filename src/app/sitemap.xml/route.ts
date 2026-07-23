import fallback from "@/config/sitemap-fallback.json";
import { getCachedAlbumCount } from "@/lib/harvest/catalog-cache";
import { escapeXml, xmlResponse } from "@/lib/sitemap-xml";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 86400;

export async function GET() {
  let albumPages = fallback.albumPages;
  try {
    albumPages = Math.max(1, Math.ceil(await getCachedAlbumCount() / 100));
  } catch {
    // The versioned fallback keeps the index stable during an upstream outage.
  }
  const children = [
    "static",
    "labels",
    "playlists",
    "collections",
    "selections",
    ...Array.from({ length: albumPages }, (_, index) => `albums/${index + 1}`),
  ];
  const nodes = children.map((path) => `<sitemap><loc>${escapeXml(`${SITE_URL}/sitemaps/${path}.xml`)}</loc></sitemap>`).join("");
  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${nodes}</sitemapindex>`, 86400);
}
