import { AlbumsPageClient } from "@/components/catalog/AlbumsPageClient";
import { getCachedAlbumDiscovery } from "@/lib/harvest/catalog-cache";
import { getRequestLocale } from "@/lib/locale-server";
import { buildMetadata, hasSearchParams, type PageSearchParams } from "@/lib/seo";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";

export async function generateMetadata({ searchParams }: { searchParams: PageSearchParams }) {
  const [locale, filtered] = await Promise.all([
    getRequestLocale(),
    hasSearchParams(searchParams),
  ]);
  return buildMetadata({
    locale,
    path: "/albums",
    title: locale === "fr" ? "Albums de musique de production" : "Production music albums",
    description: locale === "fr" ? "Explorez les albums du catalogue Parigo Music pour le cinéma, la télévision, la publicité et les contenus de marque." : "Explore Parigo Music production albums for film, television, advertising and branded content.",
    index: !filtered,
    follow: true,
  });
}

export default async function AlbumsPage() {
  const albums = await getCachedAlbumDiscovery({ limit: 20, sort: "recent" });
  return <ReactQueryProvider><AlbumsPageClient
    initialAlbums={{ albums: albums.items, facets: albums.facets, pagination: { total: albums.total, limit: albums.pageSize, offset: 0, hasMore: albums.items.length < albums.total } }}
  /></ReactQueryProvider>;
}
