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
    path: "/notre-label",
    title: locale === "fr" ? "Notre label" : "Our label",
    description: locale === "fr"
      ? "Découvrez les productions originales au cœur de l’identité musicale de Parigo."
      : "Discover the original productions at the heart of Parigo’s musical identity.",
    index: !filtered,
    follow: true,
  });
}

export default async function OurLabelPage() {
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
          title={locale === "fr" ? "Notre label" : "Our label"}
          intro={locale === "fr"
            ? "Nos productions originales, au cœur de l’identité musicale de Parigo."
            : "Our original productions, at the heart of Parigo’s musical identity."}
          containerClassName="max-w-[1920px]"
        />
        <div className="mx-auto max-w-[1920px] px-[var(--space-page-gutter)] pb-[var(--space-section-y)] pt-[var(--space-page-hero-follow)]">
          <ReactQueryProvider>
            <AlbumExplorer
              initialData={initialData}
              fixedLabel={PARIGO_LABEL_ID}
              accentMobileFilter
              queryPlaceholder={{
                fr: "Titre, référence ou mot-clé dans notre label",
                en: "Title, reference or keyword in our label",
              }}
            />
          </ReactQueryProvider>
        </div>
      </main>
      <Footer />
    </div>
  );
}
