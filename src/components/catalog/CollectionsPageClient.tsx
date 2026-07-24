"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { CatalogHero } from "@/components/catalog/CatalogHero";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { useI18n } from "@/components/providers/I18nProvider";
import type { CatalogCategory, ViewMode } from "@/types";

type CollectionSort = "title-asc" | "title-desc" | "albums-desc";

export function CollectionsPageClient({ initialItems }: { initialItems: CatalogCategory[] }) {
  const { locale, localizedPath } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [sort, setSort] = useState<CollectionSort>(
    searchParams.get("sort") === "title-desc" || searchParams.get("sort") === "albums-desc"
      ? searchParams.get("sort") as CollectionSort
      : "title-asc",
  );
  const [view, setView] = useState<ViewMode>(searchParams.get("view") === "list" ? "list" : "grid");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return initialItems
      .filter((item) => !normalized || item.name.toLocaleLowerCase(locale).includes(normalized))
      .sort((left, right) => {
        if (sort === "albums-desc") return (right.count ?? 0) - (left.count ?? 0) || left.name.localeCompare(right.name, locale);
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
              { value: "albums-desc", label: locale === "fr" ? "Plus d’albums" : "Most albums" },
            ]}
            view={view}
            onViewChange={setView}
            resultCount={filtered.length}
          />
          {view === "grid" ? (
            <div className="grid border-l border-t border-[var(--line)] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((item, index) => (
                <Link key={item.id} href={localizedPath(`/collections/${item.id}`)} className="group flex min-h-44 flex-col justify-between border-b border-r border-[var(--line)] p-5 transition hover:bg-[var(--signal-soft)]">
                  <div className="flex items-center justify-between"><span className="font-mono text-[.62rem] opacity-40">{String(index + 1).padStart(3, "0")}</span><span className="font-mono text-[.58rem] uppercase tracking-[.1em] text-[var(--text-muted)]">{item.count ?? 0} {locale === "fr" ? "albums" : "albums"}</span></div>
                  <h2 className="break-words font-[var(--font-editorial)] text-3xl font-normal tracking-[-.04em] group-hover:italic">{item.name}</h2>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border-t border-[var(--line)]">
              {filtered.map((item, index) => (
                <Link key={item.id} href={localizedPath(`/collections/${item.id}`)} className="grid min-h-20 grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-[var(--line)] px-3 hover:bg-[var(--surface-soft)]">
                  <span className="font-mono text-[.58rem] text-[var(--text-muted)]">{String(index + 1).padStart(3, "0")}</span>
                  <h2 className="truncate text-xl font-semibold">{item.name}</h2>
                  <span className="font-mono text-xs text-[var(--text-muted)]">{item.count ?? 0} albums</span>
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
