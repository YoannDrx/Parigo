import { SITE_URL } from "./seo";

export function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;",
  })[character] || character);
}

interface SitemapEntry {
  fr: string;
  en: string;
  lastModified?: string;
  priority?: number;
}

function absolute(path: string) {
  return `${SITE_URL}${path || "/"}`;
}

export function renderUrlSet(entries: SitemapEntry[]): string {
  const urls = entries.flatMap((entry) => ([
    { location: entry.fr },
    { location: entry.en },
  ]).map(({ location }) => [
    "<url>",
    `<loc>${escapeXml(absolute(location))}</loc>`,
    `<xhtml:link rel="alternate" hreflang="fr" href="${escapeXml(absolute(entry.fr))}" />`,
    `<xhtml:link rel="alternate" hreflang="en" href="${escapeXml(absolute(entry.en))}" />`,
    `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(absolute(entry.fr))}" />`,
    entry.lastModified ? `<lastmod>${escapeXml(entry.lastModified)}</lastmod>` : "",
    entry.priority ? `<priority>${entry.priority}</priority>` : "",
    "</url>",
  ].join("")));
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join("")}</urlset>`;
}

export function xmlResponse(xml: string, revalidate = 3600): Response {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, s-maxage=${revalidate}, stale-while-revalidate=${revalidate * 24}`,
    },
  });
}

export function unavailableSitemap(): Response {
  return new Response("Catalogue temporarily unavailable", {
    status: 503,
    headers: { "Retry-After": "300", "Cache-Control": "no-store" },
  });
}
