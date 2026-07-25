"use client";

import Link from "next/link";
import { ArrowUpRight, Disc3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { CatalogHero } from "@/components/catalog/CatalogHero";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { useI18n } from "@/components/providers/I18nProvider";
import type { CatalogCategory, ViewMode } from "@/types";

type CollectionSort = "title-asc" | "title-desc" | "tracks-desc";

export function CollectionsPageClient({ initialItems }: { initialItems: CatalogCategory[] }) {
  const { locale, localizedPath } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [sort, setSort] = useState<CollectionSort>(
    searchParams.get("sort") === "title-desc" || searchParams.get("sort") === "tracks-desc"
      ? searchParams.get("sort") as CollectionSort
      : "title-asc",
  );
  const [view, setView] = useState<ViewMode>(searchParams.get("view") === "list" ? "list" : "grid");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return initialItems
      .filter((item) => !normalized || item.name.toLocaleLowerCase(locale).includes(normalized))
      .sort((left, right) => {
        if (sort === "tracks-desc") return (right.trackCount ?? 0) - (left.trackCount ?? 0) || left.name.localeCompare(right.name, locale);
        const comparison = left.name.localeCompare(right.name, locale, { sensitivity: "base" });
        return sort === "title-desc" ? -comparison : comparison;
      });
  }, [initialItems, locale, query, sort]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (sort !== "title-asc") params.set("sort", sort);
    if (view !== "grid") params.set("view", view);
    const next = params.toString();
    if (next !== searchParams.toString()) router.replace(`${pathname}${next ? `?${next}` : ""}`, { scroll: false });
  }, [pathname, query, router, searchParams, sort, view]);

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <CatalogHero
          eyebrow="Parigo / Styles"
          title={locale === "fr" ? "Les collections" : "Collections"}
          intro={locale === "fr"
            ? "Les collections correspondent aux styles et univers musicaux qui structurent le catalogue. Utilisez-les comme des portes d’entrée vers une esthétique, une époque ou un territoire sonore."
            : "Collections are the styles and musical worlds used to organise the catalogue. Use them as gateways into an aesthetic, period or sonic territory."}
          meta={`${initialItems.length} collections`}
        />
        <section className="mx-auto max-w-[1600px] px-4 py-16 md:px-8 md:py-24">
          <CatalogToolbar
            locale={locale}
            query={query}
            onQueryChange={setQuery}
            queryPlaceholder={locale === "fr" ? "Rechercher une collection ou un style" : "Search collections and styles"}
            sort={sort}
            onSortChange={setSort}
            sortOptions={[
              { value: "title-asc", label: "A–Z" },
              { value: "title-desc", label: "Z–A" },
              { value: "tracks-desc", label: locale === "fr" ? "Plus de pistes indexées" : "Most indexed tracks" },
            ]}
            view={view}
            onViewChange={setView}
            resultCount={filtered.length}
          >
            <div className="mt-4 border-t border-[var(--line)] pt-4">
              <p className="max-w-3xl text-xs leading-relaxed text-[var(--text-muted)]">
                <strong className="text-[var(--foreground)]">{locale === "fr" ? "À propos des volumes — " : "About counts — "}</strong>
                {locale === "fr"
                  ? "Les styles sont associés aux pistes et à leurs versions. Le volume affiché ici indique donc des pistes indexées ; le nombre exact d’albums est calculé sur la page de chaque collection."
                  : "Styles are associated with tracks and their versions. The volume shown here therefore represents indexed tracks; the exact album count is calculated on each collection page."}
              </p>
            </div>
          </CatalogToolbar>
          {view === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((item, index) => (
                <Link key={item.id} href={localizedPath(`/collections/${item.id}`)} className="collection-card group flex min-h-52 flex-col justify-between border border-[var(--line-strong)] bg-[var(--surface)] p-5 transition">
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-mono text-[.58rem] tracking-[.1em] text-[var(--signal-strong)]">COL.{String(index + 1).padStart(3, "0")}</span>
                    <ArrowUpRight size={17} className="text-[var(--text-muted)] transition duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[var(--foreground)] group-focus-visible:-translate-y-1 group-focus-visible:translate-x-1" />
                  </div>
                  <h2 className="my-8 break-words font-[var(--font-editorial)] text-4xl font-normal tracking-[-.05em] transition group-hover:italic group-hover:text-[var(--signal-strong)]">{item.name}</h2>
                  <div className="flex items-center justify-between border-t border-[var(--line)] pt-4">
                    <span className="inline-flex items-center gap-2 font-mono text-[.58rem] uppercase tracking-[.08em] text-[var(--text-muted)]"><Disc3 size={13} />{item.trackCount ?? 0} {locale === "fr" ? "pistes indexées" : "indexed tracks"}</span>
                    <span aria-hidden="true" className="h-px w-8 bg-[var(--signal-strong)] transition-all duration-500 group-hover:w-16" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border-t border-[var(--line)]">
              {filtered.map((item, index) => (
                <Link key={item.id} href={localizedPath(`/collections/${item.id}`)} className="grid min-h-20 grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-[var(--line)] px-3 hover:bg-[var(--surface-soft)]">
                  <span className="font-mono text-[.58rem] text-[var(--text-muted)]">{String(index + 1).padStart(3, "0")}</span>
                  <h2 className="truncate text-xl font-semibold">{item.name}</h2>
                  <span className="font-mono text-xs text-[var(--text-muted)]">{item.trackCount ?? 0} {locale === "fr" ? "pistes indexées" : "indexed tracks"}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
