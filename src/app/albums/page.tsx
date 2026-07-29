import { Suspense } from "react";
import { AlbumExplorer } from "@/components/catalog/AlbumExplorer";
import { CatalogHero } from "@/components/catalog/CatalogHero";
import { Footer, Header } from "@/components/layout";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { messages } from "@/i18n/messages";
import { getCachedAlbumDiscovery } from "@/lib/harvest/catalog-cache";
import { getRequestLocale } from "@/lib/locale-server";
import { buildMetadata, hasSearchParams, type PageSearchParams } from "@/lib/seo";

type AlbumDiscoveryPromise = ReturnType<typeof getCachedAlbumDiscovery>;

async function AlbumMeta({
  albumsPromise,
  label,
}: {
  albumsPromise: AlbumDiscoveryPromise;
  label: string;
}) {
  const albums = await albumsPromise;
  return <>{albums.total} {label}</>;
}

async function AlbumExplorerContent({
  albumsPromise,
}: {
  albumsPromise: AlbumDiscoveryPromise;
}) {
  const albums = await albumsPromise;
  const initialAlbums = {
    albums: albums.items,
    facets: albums.facets,
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
          meta={(
            <Suspense fallback={copy.common.albums.toLowerCase()}>
              <AlbumMeta albumsPromise={albumsPromise} label={copy.common.albums.toLowerCase()} />
            </Suspense>
          )}
        />
        <div className="mx-auto max-w-[1700px] px-4 py-10 sm:px-6 md:py-16 lg:px-8">
          <Suspense fallback={<div className="grid min-h-72 place-items-center"><ParigoLoader size="page" label={copy.common.loading} /></div>}>
            <AlbumExplorerContent albumsPromise={albumsPromise} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
