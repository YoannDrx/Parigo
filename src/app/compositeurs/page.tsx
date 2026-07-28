import type { Metadata } from "next";
import { CatalogHero } from "@/components/catalog/CatalogHero";
import { ParigoSearchForm } from "@/components/catalog/ParigoSearchForm";
import { ComposerCard } from "@/components/editorial/ComposerCard";
import { Footer, Header } from "@/components/layout";
import { publishedComposerProfiles } from "@/lib/editorial/contracts";
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
      ? "Découvrez les compositeurs et collectifs qui signent les productions Parigo."
      : "Discover the composers and collectives behind Parigo releases.",
    index: !params.q,
  });
}

export default async function ComposersPage({ searchParams }: ComposersPageProps) {
  const [locale, params] = await Promise.all([getRequestLocale(), searchParams]);
  const query = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim() ?? "";
  const profiles = publishedComposerProfiles.filter((profile) => (
    !query || profile.name.localeCompare(query, locale, { sensitivity: "base" }) === 0
      || profile.name.toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale))
  ));

  return (
    <div className="page-shell min-h-screen">
      <Header />
      <main>
        <CatalogHero
          title={locale === "fr" ? "Compositeurs" : "Composers"}
          intro={locale === "fr"
            ? "Portraits et discographies des artistes qui composent les sorties du label."
            : "Profiles and discographies of the artists composing the label’s releases."}
          meta={`${publishedComposerProfiles.length} ${locale === "fr" ? "profils vérifiés" : "verified profiles"}`}
        />
        <section className="mx-auto max-w-[1700px] px-4 py-14 sm:px-6 lg:px-8 md:py-20">
          <ParigoSearchForm
            action={locale === "en" ? "/en/compositeurs" : "/compositeurs"}
            defaultValue={query}
            placeholder={locale === "fr" ? "Rechercher par nom…" : "Search by name…"}
            label={locale === "fr" ? "Rechercher un compositeur" : "Search composers"}
            locale={locale}
          />
          {profiles.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
              {profiles.map((profile) => <ComposerCard key={profile.slug} profile={profile} locale={locale} />)}
            </div>
          ) : (
            <p className="border-y border-[var(--line)] py-16 text-center text-[var(--text-muted)]">
              {locale === "fr" ? "Aucun profil ne correspond à cette recherche." : "No profile matches this search."}
            </p>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
