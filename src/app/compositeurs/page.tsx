import type { Metadata } from "next";
import { CatalogHero } from "@/components/catalog/CatalogHero";
import { ComposerDirectoryClient } from "@/components/catalog/ComposerDirectoryClient";
import { Footer, Header } from "@/components/layout";
import { getParigoHarvestComposerInventory } from "@/lib/harvest/composer-inventory";
import { emptyCanonicalComposerSummaries } from "@/lib/composers/profiles";
import { getRequestLocale } from "@/lib/locale-server";
import { buildMetadata, type PageSearchParams } from "@/lib/seo";

interface ComposersPageProps {
  searchParams: PageSearchParams;
}

export async function generateMetadata({ searchParams }: ComposersPageProps): Promise<Metadata> {
  const [locale, params] = await Promise.all([getRequestLocale(), searchParams]);
  return buildMetadata({
    locale,
    path: "/compositeurs",
    title: locale === "fr" ? "Compositeurs" : "Composers",
    description: locale === "fr"
      ? "Découvrez les 45 compositeurs et collectifs Parigo, leurs biographies et leur discographie Harvest."
      : "Discover Parigo's 45 composers and collectives, their biographies and Harvest discography.",
    index: !params.q,
  });
}

export default async function ComposersPage({ searchParams }: ComposersPageProps) {
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
          title={locale === "fr" ? "Compositeurs" : "Composers"}
          intro={locale === "fr"
            ? "Les profils publics Parigo, reliés à leurs crédits et albums réellement renvoyés par Harvest."
            : "Parigo public profiles, linked to the credits and albums actually returned by Harvest."}
          meta={`45 ${locale === "fr" ? "profils" : "profiles"}${directory.state === "unavailable" ? ` · ${locale === "fr" ? "discographie temporairement indisponible" : "discography temporarily unavailable"}` : ""}`}
        />
        <section className="mx-auto max-w-[1700px] px-4 py-14 sm:px-6 lg:px-8 md:py-20">
          {directory.state === "unavailable" && <p role="alert" className="mb-6 border-l-2 border-[var(--danger)] pl-4 text-sm text-[var(--danger)]">
            {locale === "fr" ? "Les profils restent disponibles, mais les compteurs et albums Harvest n’ont pas pu être chargés." : "Profiles remain available, but Harvest counts and albums could not be loaded."}
          </p>}
          <ComposerDirectoryClient
            profiles={directory.profiles}
            initialQuery={query}
            locale={locale}
            pathname={locale === "en" ? "/en/compositeurs" : "/compositeurs"}
          />
        </section>
      </main>
      <Footer />
    </div>
  );
}
