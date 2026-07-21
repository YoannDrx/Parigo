import type { MetadataRoute } from "next";
import { getAlbums } from "@/lib/harvest/catalog";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.parigomusic.com";

export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  let albumSitemaps = 1;
  try {
    const result = await getAlbums({ limit: 1 });
    albumSitemaps = Math.max(1, Math.ceil(result.total / 100));
  } catch {
    // Keep the first page discoverable while Harvest is temporarily unavailable.
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/account/"] },
    sitemap: [
      `${baseUrl}/sitemap.xml`,
      ...Array.from({ length: albumSitemaps }, (_, index) => `${baseUrl}/sitemaps/albums/${index + 1}.xml`),
    ],
  };
}
