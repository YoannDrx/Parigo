import type { Metadata } from "next";
import { CatalogHero } from "@/components/catalog/CatalogHero";
import { ComposerDirectoryClient } from "@/components/catalog/ComposerDirectoryClient";
import { Footer, Header } from "@/components/layout";
import { getParigoHarvestComposerInventory } from "@/lib/harvest/composer-inventory";
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
      ? "Consultez les libellés de crédits compositeur renvoyés par Harvest sur les productions Parigo."
      : "Browse composer credit labels returned by Harvest for Parigo releases.",
    index: !params.q,
  });
}

export default async function ComposersPage({ searchParams }: ComposersPageProps) {
  const [locale, params, directory] = await Promise.all([
    getRequestLocale(),
    searchParams,
    getParigoHarvestComposerInventory()
      .then((inventory) => ({ state: "ready" as const, inventory }))
      .catch(() => ({ state: "unavailable" as const, inventory: null })),
  ]);
  const query = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim() ?? "";
  return (
    <div className="page-shell min-h-screen">
      <Header />
      <main>
        <CatalogHero
          title={locale === "fr" ? "Compositeurs" : "Composers"}
          intro={locale === "fr"
            ? "Les crédits sont reproduits à l’identique depuis les pistes Harvest. Chaque variante reste distincte jusqu’à sa correction dans le CMS."
            : "Credits are reproduced exactly from Harvest tracks. Each variant remains separate until it is corrected in the CMS."}
          meta={directory.state === "ready"
            ? `${directory.inventory.credits.length} ${locale === "fr" ? "crédits Harvest exacts" : "exact Harvest credits"}`
            : (locale === "fr" ? "Source catalogue indisponible" : "Catalog source unavailable")}
        />
        <section className="mx-auto max-w-[1700px] px-4 py-14 sm:px-6 lg:px-8 md:py-20">
          {directory.state === "ready" ? (
            <ComposerDirectoryClient
              credits={directory.inventory.credits}
              initialQuery={query}
              locale={locale}
              pathname={locale === "en" ? "/en/compositeurs" : "/compositeurs"}
            />
          ) : (
            <div role="alert" className="border border-[var(--line-strong)] bg-[var(--surface)] px-6 py-16 text-center">
              <h2 className="text-2xl font-semibold">
                {locale === "fr" ? "Le répertoire du catalogue est momentanément indisponible." : "The catalog directory is temporarily unavailable."}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--text-muted)]">
                {locale === "fr"
                  ? "Aucun crédit local n’est affiché en remplacement : la page attend les crédits réellement renvoyés par Harvest."
                  : "No local credit is shown as a fallback: this page waits for credits actually returned by Harvest."}
              </p>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
