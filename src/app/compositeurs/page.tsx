import type { Metadata } from "next";
import { CatalogHero } from "@/components/catalog/CatalogHero";
import { ComposerDirectoryClient } from "@/components/catalog/ComposerDirectoryClient";
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
          <ComposerDirectoryClient
            profiles={publishedComposerProfiles}
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
