import { AlbumExplorer } from "@/components/catalog/AlbumExplorer";
import { CatalogHero } from "@/components/catalog/CatalogHero";
import { Footer, Header } from "@/components/layout";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";
import { messages } from "@/i18n/messages";
import { getCachedAlbumDiscovery } from "@/lib/harvest/catalog-cache";
import { getRequestLocale } from "@/lib/locale-server";
import { buildMetadata, hasSearchParams, type PageSearchParams } from "@/lib/seo";
import type { Album } from "@/types";

type AlbumDiscovery = Awaited<ReturnType<typeof getCachedAlbumDiscovery>>;

function AlbumExplorerContent({
  albums,
}: {
  albums: AlbumDiscovery;
}) {
  const initialAlbums = {
    // Keep the streamed payload focused on what the cards render. The client
    // refreshes this query after hydration and restores the full records/facets.
    albums: albums.items.map((album): Album => ({
      id: album.id,
      slug: album.slug,
      title: album.title,
      label: album.label,
      labelSlug: album.labelSlug,
      cover: album.cover,
      genres: album.genres,
      trackCount: album.trackCount,
    })),
    pagination: { total: albums.total, limit: albums.pageSize, offset: 0, hasMore: albums.items.length < albums.total },
  };

  return (
    <ReactQueryProvider>
      <AlbumExplorer initialData={initialAlbums} />
    </ReactQueryProvider>
  );
}

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
  // Resolve the first page before rendering so its LCP artwork is emitted in
  // the initial document instead of a late streamed Suspense boundary.
  const [albums, locale] = await Promise.all([
    getCachedAlbumDiscovery({ limit: 20, sort: "recent" }),
    getRequestLocale(),
  ]);
  const copy = messages[locale];

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <CatalogHero
          title={copy.catalog.albumsTitle}
          intro={copy.catalog.albumsIntro}
          meta={`${albums.total} ${copy.common.albums.toLowerCase()}`}
        />
        <div className="mx-auto max-w-[1920px] px-3 py-4 sm:px-4 md:py-6">
          <AlbumExplorerContent albums={albums} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
