import type { MetadataRoute } from "next";
import { SYNCHRONISATIONS } from "@/content/synchronisations";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.parigomusic.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "", "/search", "/albums", "/labels", "/collections", "/playlists",
    "/synchronisations", "/licensing", "/contact", "/about", "/legal", "/privacy", "/terms", "/rights",
  ];
  const staticPages: MetadataRoute.Sitemap = paths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : path === "/albums" || path === "/search" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/search" || path === "/albums" ? 0.9 : 0.6,
  }));
  return [
    ...staticPages,
    ...SYNCHRONISATIONS.map(({ slug }) => ({
      url: `${baseUrl}/synchronisations/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.55,
    })),
  ];
}
