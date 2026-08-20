"use client";

import Link from "next/link";
import { ArrowUpRight, Building2, Disc3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { CatalogHero } from "@/components/catalog";
import { LabelLogo } from "@/components/catalog/LabelLogo";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { useI18n } from "@/components/providers/I18nProvider";
import type { ViewMode } from "@/types";

interface Label {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  albumCount: number;
}

type LabelSort = "title-asc" | "title-desc" | "albums-desc";

export function LabelsPageClient({ labels }: { labels: Label[] }) {
  const { locale, t, localizedPath } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [sort, setSort] = useState<LabelSort>(
    searchParams.get("sort") === "title-desc" || searchParams.get("sort") === "albums-desc"
      ? searchParams.get("sort") as LabelSort
      : "title-asc",
  );
  const [view, setView] = useState<ViewMode>(searchParams.get("view") === "list" ? "list" : "grid");
  const visibleLabels = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return labels
      .filter((label) => !normalized || `${label.name} ${label.description ?? ""}`.toLocaleLowerCase(locale).includes(normalized))
      .sort((left, right) => {
        if (sort === "albums-desc") return right.albumCount - left.albumCount || left.name.localeCompare(right.name, locale);
        const comparison = left.name.localeCompare(right.name, locale, { sensitivity: "base" });
        return sort === "title-desc" ? -comparison : comparison;
      });
  }, [labels, locale, query, sort]);

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
      <main className="flex-1 pb-32">
        <CatalogHero title={t("catalog.labelsTitle")} intro={t("catalog.labelsIntro")} meta={`${labels.length} ${t("common.labels").toLowerCase()}`} />
        <div className="mx-auto max-w-[1920px] px-3 py-4 sm:px-4 md:py-6">
          <CatalogToolbar
            locale={locale}
            query={query}
            onQueryChange={setQuery}
            queryPlaceholder={locale === "fr" ? "Rechercher un label" : "Search labels"}
            sort={sort}
            onSortChange={setSort}
            sortOptions={[
              { value: "title-asc", label: "A–Z" },
              { value: "title-desc", label: "Z–A" },
              { value: "albums-desc", label: locale === "fr" ? "Plus d’albums" : "Most albums" },
            ]}
            view={view}
            onViewChange={setView}
            resultCount={visibleLabels.length}
          />
          {visibleLabels.length === 0 ? (
            <div className="py-24 text-center"><Building2 size={42} className="mx-auto mb-6 opacity-25" /><h2 className="font-[var(--font-editorial)] text-5xl font-normal">{t("catalog.noLabels")}</h2></div>
          ) : (
            <>
              {view === "grid" ? (
                <div data-testid="labels-mobile-grid" className="grid grid-cols-2 border-l border-t border-[var(--line)] md:hidden">
                  {visibleLabels.map((label) => (
                    <Link key={label.id} href={localizedPath(`/labels/${label.slug}`)} className="group flex min-h-40 min-w-0 flex-col justify-between border-b border-r border-[var(--line)] p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--signal-strong)]">
                      <div className="relative h-12 w-full"><LabelLogo src={label.logo} alt="" fill sizes="144px" className="object-contain object-left grayscale" /></div>
                      <div className="mt-5 min-w-0">
                        <h2 className="break-words text-base font-semibold leading-[1.08] tracking-[-.025em]">{label.name}</h2>
                        <span className="mt-3 flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]"><span className="flex items-center gap-1.5"><Disc3 size={13} />{label.albumCount}</span><ArrowUpRight size={14} /></span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div data-testid="labels-mobile-list" className="border-t border-[var(--line)] md:hidden">
                  {visibleLabels.map((label) => (
                    <Link key={label.id} href={localizedPath(`/labels/${label.slug}`)} className="group grid min-h-20 grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--line)] py-3">
                      <div className="relative h-11 w-full"><LabelLogo src={label.logo} alt="" fill sizes="56px" className="object-contain object-left grayscale" /></div>
                      <h2 className="min-w-0 break-words text-lg font-semibold leading-tight tracking-[-.025em]">{label.name}</h2>
                      <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-[var(--text-muted)]"><Disc3 size={13} />{label.albumCount}<ArrowUpRight size={14} /></span>
                    </Link>
                  ))}
                </div>
              )}
              {view === "grid" ? (
            <div className="hidden border-l border-t border-[var(--line)] md:grid md:grid-cols-3 xl:grid-cols-4">
              {visibleLabels.map((label) => (
                <article key={label.id} className="label-editorial-card group relative min-w-0 overflow-hidden border-b border-r border-[var(--line)]">
                  <Link href={localizedPath(`/labels/${label.slug}`)} className="flex min-h-56 min-w-0 flex-col justify-between p-4 focus-visible:outline-none sm:min-h-64 sm:p-6">
                    <h2 className="max-w-[12ch] break-words font-[var(--font-editorial)] text-[clamp(1.65rem,3vw,3rem)] font-normal leading-[.92] tracking-[-.045em] transition-colors group-hover:text-[var(--color-primary-dark)]">{label.name}</h2>
                    <div className="mt-8 flex items-center justify-between gap-2 font-mono text-[.58rem] uppercase tracking-[.08em] text-[var(--text-muted)]"><span className="flex items-center gap-2"><Disc3 size={13} /> {label.albumCount} {label.albumCount === 1 ? t("catalog.album") : t("catalog.albums")}</span><ArrowUpRight size={16} className="shrink-0 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--signal-strong)]" /></div>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="hidden border-t border-[var(--line)] md:block">
              {visibleLabels.map((label) => (
                <Link key={label.id} href={localizedPath(`/labels/${label.slug}`)} className="group grid min-h-24 grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-[var(--line)] py-4 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:px-4">
                  <div className="relative h-14 w-full"><LabelLogo src={label.logo} alt={label.name} fill sizes="128px" className="object-contain object-left grayscale transition group-hover:grayscale-0" /></div>
                  <div className="min-w-0"><h2 className="truncate text-xl font-semibold sm:text-2xl">{label.name}</h2></div>
                  <span className="flex items-center gap-2 whitespace-nowrap pr-2 text-xs text-[var(--text-muted)]"><Disc3 size={14} />{label.albumCount}</span>
                </Link>
              ))}
            </div>
          )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
