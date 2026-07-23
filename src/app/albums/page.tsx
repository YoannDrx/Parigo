import { AlbumsPageClient } from "@/components/catalog/AlbumsPageClient";
import { getCachedAlbums, getCachedCategories, getCachedLabels } from "@/lib/harvest/catalog-cache";
import { getRequestLocale } from "@/lib/locale-server";
import { buildMetadata } from "@/lib/seo";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";

export async function generateMetadata() {
  const locale = await getRequestLocale();
  return buildMetadata({
    locale,
    path: "/albums",
    title: locale === "fr" ? "Albums de musique de production" : "Production music albums",
    description: locale === "fr" ? "Explorez les albums du catalogue Parigo Music pour le cinéma, la télévision, la publicité et les contenus de marque." : "Explore Parigo Music production albums for film, television, advertising and branded content.",
  });
}

export default async function AlbumsPage() {
  const [albums, labels, categories] = await Promise.all([
    getCachedAlbums({ limit: 50 }),
    getCachedLabels(),
    getCachedCategories("en"),
  ]);
  const genreRoot = categories.find((category) => /^genres?$/i.test(category.name));
  return <ReactQueryProvider><AlbumsPageClient
    initialAlbums={{ albums: albums.items, pagination: { total: albums.total, limit: albums.pageSize, offset: 0, hasMore: albums.items.length < albums.total } }}
    initialLabels={{ labels: labels.slice(0, 20), pagination: { total: labels.length, limit: 20, offset: 0, hasMore: labels.length > 20 } }}
    initialGenres={{ genres: (genreRoot?.children || []).map((item) => ({ id: item.id, name: item.name, slug: item.id })) }}
  /></ReactQueryProvider>;
}
