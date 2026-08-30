import { Suspense } from "react";
import { AlbumExplorer } from "@/components/catalog/AlbumExplorer";
import { CatalogHero } from "@/components/catalog/CatalogHero";
import { Footer, Header } from "@/components/layout";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";
import { messages } from "@/i18n/messages";
import { getCachedAlbumDiscovery } from "@/lib/harvest/catalog-cache";
import { getRequestLocale } from "@/lib/locale-server";
import { buildMetadata, hasSearchParams, type PageSearchParams } from "@/lib/seo";
import type { Album } from "@/types";

type AlbumDiscoveryPromise = ReturnType<typeof getCachedAlbumDiscovery>;

async function AlbumExplorerContent({
  albumsPromise,
}: {
  albumsPromise: AlbumDiscoveryPromise;
}) {
  const albums = await albumsPromise;
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
      code: album.code,
      trackCount: album.trackCount,
    })),
    pagination: { total: albums.total, limit: albums.pageSize, offset: 0, hasMore: albums.items.length < albums.total },
  };

  return (
    <ReactQueryProvider>
      <AlbumExplorer initialData={initialAlbums} separateMobileSearch accentMobileFilter />
    </ReactQueryProvider>
  );
}

function AlbumExplorerFallback({ loadingLabel }: { loadingLabel: string }) {
  return (
    <div aria-label={loadingLabel} aria-busy="true" className="grid min-w-0 items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
      <div aria-hidden="true" className="hidden min-h-[34rem] border border-[var(--line)] bg-[var(--surface-soft)] lg:block" />
      <div className="min-w-0">
        <div aria-hidden="true" className="mb-4 h-44 border border-[var(--line)] bg-[var(--surface-soft)] sm:h-32" />
        <div aria-hidden="true" className="grid grid-cols-1 gap-x-4 gap-y-12 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 20 }, (_, index) => (
            <div key={index} className="border border-[var(--line)] bg-[var(--surface)]">
              <div className="aspect-square border-b border-[var(--line)] bg-[var(--surface-soft)]" />
              <div className="h-28 p-4">
                <div className="h-5 w-4/5 bg-[var(--surface-soft)]" />
                <div className="mt-3 h-3 w-2/3 bg-[var(--surface-soft)]" />
                <div className="mt-5 h-3 w-1/2 bg-[var(--surface-soft)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
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
  const albumsPromise = getCachedAlbumDiscovery({ limit: 20, sort: "recent" });
  const locale = await getRequestLocale();
  const copy = messages[locale];

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <CatalogHero
          title={copy.catalog.albumsTitle}
          intro={copy.catalog.albumsIntro}
          containerClassName="max-w-[1920px]"
        />
        <div className="mx-auto max-w-[1920px] px-[var(--space-page-gutter)] pb-[var(--space-section-y)] pt-[var(--space-page-hero-follow)]">
          <Suspense fallback={<AlbumExplorerFallback loadingLabel={copy.common.loading} />}>
            <AlbumExplorerContent albumsPromise={albumsPromise} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
