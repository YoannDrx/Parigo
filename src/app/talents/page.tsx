import type { Metadata } from "next";
import { CatalogHero } from "@/components/catalog/CatalogHero";
import { ComposerDirectoryClient } from "@/components/catalog/ComposerDirectoryClient";
import { Footer, Header } from "@/components/layout";
import { getParigoHarvestComposerInventory } from "@/lib/harvest/composer-inventory";
import { CANONICAL_COMPOSER_PROFILE_COUNT, emptyCanonicalComposerSummaries } from "@/lib/composers/profiles";
import { getRequestLocale } from "@/lib/locale-server";
import { buildMetadata, type PageSearchParams } from "@/lib/seo";

interface TalentsPageProps {
  searchParams: PageSearchParams;
}

export async function generateMetadata({ searchParams }: TalentsPageProps): Promise<Metadata> {
  const [locale, params] = await Promise.all([getRequestLocale(), searchParams]);
  return buildMetadata({
    locale,
    path: "/talents",
    title: locale === "fr" ? "Nos talents" : "Our talent",
    description: locale === "fr"
      ? `Découvrez les ${CANONICAL_COMPOSER_PROFILE_COUNT} compositeurs et collectifs Parigo, leurs biographies et leurs albums.`
      : `Discover Parigo's ${CANONICAL_COMPOSER_PROFILE_COUNT} composers and collectives, their biographies and albums.`,
    index: !params.q,
  });
}

export default async function TalentsPage({ searchParams }: TalentsPageProps) {
  const [locale, params, directory] = await Promise.all([
    getRequestLocale(),
    searchParams,
    getParigoHarvestComposerInventory()
      .then((inventory) => ({ state: "ready" as const, profiles: inventory.profiles }))
      .catch(() => ({ state: "unavailable" as const, profiles: emptyCanonicalComposerSummaries() })),
  ]);
  const query = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim() ?? "";
  return (
    <div className="page-shell min-h-screen">
      <Header />
      <main>
        <CatalogHero
          title={locale === "fr" ? "Nos talents" : "Our talent"}
          intro={locale === "fr"
            ? "Les compositrices, compositeurs, artistes et collectifs qui donnent sa couleur au catalogue original Parigo."
            : "The composers, artists and collectives who give Parigo’s original catalogue its unique character."}
        />
        <section className="mx-auto max-w-[1700px] px-4 py-14 sm:px-6 lg:px-8 md:py-20">
          {directory.state === "unavailable" && <p role="alert" className="mb-6 border-l-2 border-[var(--danger)] pl-4 text-sm text-[var(--danger)]">
            {locale === "fr" ? "Les profils restent disponibles, mais les discographies n’ont pas pu être chargées." : "Profiles remain available, but discographies could not be loaded."}
          </p>}
          <ComposerDirectoryClient
            profiles={directory.profiles}
            initialQuery={query}
            locale={locale}
            pathname={locale === "en" ? "/en/talents" : "/talents"}
          />
        </section>
      </main>
      <Footer />
    </div>
  );
}
