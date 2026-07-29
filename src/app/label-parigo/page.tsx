import { AlbumExplorer } from "@/components/catalog/AlbumExplorer";
import { CatalogHero } from "@/components/catalog/CatalogHero";
import { Footer, Header } from "@/components/layout";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";
import { PARIGO_LABEL_ID } from "@/config/catalog";
import { getCachedAlbumDiscovery } from "@/lib/harvest/catalog-cache";
import { getRequestLocale } from "@/lib/locale-server";
import { buildMetadata, hasSearchParams, type PageSearchParams } from "@/lib/seo";

export async function generateMetadata({ searchParams }: { searchParams: PageSearchParams }) {
  const [locale, filtered] = await Promise.all([getRequestLocale(), hasSearchParams(searchParams)]);
  return buildMetadata({
    locale,
    path: "/label-parigo",
    title: locale === "fr" ? "Label Parigo" : "Parigo Label",
    description: locale === "fr"
      ? "Découvrez exclusivement les albums produits et publiés par le label Parigo."
      : "Discover albums produced and released by the Parigo label.",
    index: !filtered,
    follow: true,
  });
}

export default async function ParigoLabelPage() {
  const [albums, locale] = await Promise.all([
    getCachedAlbumDiscovery({ label: PARIGO_LABEL_ID, limit: 20, sort: "recent" }),
    getRequestLocale(),
  ]);
  const initialData = {
    albums: albums.items,
    facets: albums.facets,
    pagination: {
      total: albums.total,
      limit: albums.pageSize,
      offset: 0,
      hasMore: albums.items.length < albums.total,
    },
  };

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <CatalogHero
          title={locale === "fr" ? "Label Parigo" : "Parigo Label"}
          intro={locale === "fr"
            ? "Les productions originales du label Parigo, de la toute première référence aux dernières nouveautés."
            : "Original Parigo label productions, from the first catalogue release to the latest arrivals."}
          meta={`${albums.total} albums`}
        />
        <div className="mx-auto max-w-[1920px] px-3 py-4 sm:px-4 md:py-6">
          <ReactQueryProvider>
            <AlbumExplorer
              initialData={initialData}
              fixedLabel={PARIGO_LABEL_ID}
              queryPlaceholder={{
                fr: "Rechercher dans le label Parigo",
                en: "Search the Parigo label",
              }}
            />
          </ReactQueryProvider>
        </div>
      </main>
      <Footer />
    </div>
  );
}
