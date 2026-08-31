"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { CatalogHero } from "@/components/catalog";
import { LabelLogo } from "@/components/catalog/LabelLogo";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { useI18n } from "@/components/providers/I18nProvider";
import { labelMatchesQuery } from "@/lib/label-search";
import type { ViewMode } from "@/types";

interface Label {
  id: string;
  slug: string;
  name: string;
  references?: string[];
  description: string | null;
  logo: string | null;
  website: string | null;
  albumCount: number;
}

interface ReferenceAlbumSearchItem {
  labelSlug?: string;
  code?: string;
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
  const [referenceCodesByLabel, setReferenceCodesByLabel] = useState<Record<string, string[]>>({});
  const visibleLabels = useMemo(() => {
    return labels
      .filter((label) => labelMatchesQuery({
        ...label,
        references: [
          ...(label.references ?? []),
          ...(query.trim().length >= 2 ? referenceCodesByLabel[label.id] ?? [] : []),
        ],
      }, query, locale))
      .sort((left, right) => {
        if (sort === "albums-desc") return right.albumCount - left.albumCount || left.name.localeCompare(right.name, locale);
        const comparison = left.name.localeCompare(right.name, locale, { sensitivity: "base" });
        return sort === "title-desc" ? -comparison : comparison;
      });
  }, [labels, locale, query, referenceCodesByLabel, sort]);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams({ q: normalized, view: "albums", type: "all", limit: "100" });
      void fetch(`/api/search?${params.toString()}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : null)
        .then((payload) => {
          if (!payload) return;
          const next = new Map<string, Set<string>>();
          for (const item of (payload.data?.items ?? []) as ReferenceAlbumSearchItem[]) {
            if (!item.labelSlug || !item.code) continue;
            const references = next.get(item.labelSlug) ?? new Set<string>();
            references.add(item.code);
            next.set(item.labelSlug, references);
          }
          setReferenceCodesByLabel(Object.fromEntries([...next].map(([id, values]) => [id, [...values]])));
        })
        .catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) setReferenceCodesByLabel({});
        });
    }, 180);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

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
        <CatalogHero title={t("catalog.labelsTitle")} intro={t("catalog.labelsIntro")} containerClassName="max-w-[1920px]" />
        <div className="mx-auto max-w-[1920px] px-[var(--space-page-gutter)] pb-[var(--space-section-y)] pt-[var(--space-page-hero-follow)]">
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
            viewControlVisibility="desktop"
          />
          {visibleLabels.length === 0 ? (
            <div className="py-24 text-center"><Building2 size={42} className="mx-auto mb-6 opacity-25" /><h2 className="font-[var(--font-editorial)] text-5xl font-normal">{t("catalog.noLabels")}</h2></div>
          ) : (
            <>
              {view === "grid" ? (
            <div data-testid="labels-mosaic" className="grid grid-cols-2 border-l border-t border-[var(--line)] md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {visibleLabels.map((label) => (
                <article key={label.id} className="label-editorial-card group relative aspect-square min-w-0 overflow-hidden border-b border-r border-[var(--line)]">
                  <Link href={localizedPath(`/labels/${label.slug}`)} className="relative block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--signal-strong)]">
                    <LabelLogo src={label.logo} name={label.name} decorative fill sizes="(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 25vw" fallbackSize={84} fallbackVariant="mosaic" className="object-cover transition duration-500 ease-out group-hover:scale-[1.08] group-hover:blur-[9px] group-hover:saturate-[1.35] group-focus-within:scale-[1.08] group-focus-within:blur-[9px] group-focus-within:saturate-[1.35]" />
                    <span data-testid="label-card-overlay" className="absolute inset-0 flex items-center justify-center bg-[#050806]/0 p-5 opacity-0 backdrop-blur-none transition-[opacity,background-color,backdrop-filter] duration-300 ease-out group-hover:bg-[#050806]/32 group-hover:opacity-100 group-hover:backdrop-blur-[24px] group-hover:backdrop-brightness-75 group-hover:backdrop-saturate-150 group-focus-within:bg-[#050806]/32 group-focus-within:opacity-100 group-focus-within:backdrop-blur-[24px] group-focus-within:backdrop-brightness-75 group-focus-within:backdrop-saturate-150">
                      <h2 className="max-w-[15ch] text-balance text-center font-[var(--font-editorial)] text-[clamp(1.15rem,2.4vw,2.35rem)] font-semibold leading-[.96] tracking-[-.045em] text-white drop-shadow-sm">{label.name}</h2>
                    </span>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="hidden border-t border-[var(--line)] md:block">
              {visibleLabels.map((label) => (
                <Link key={label.id} href={localizedPath(`/labels/${label.slug}`)} className="group grid min-h-24 grid-cols-[5rem_minmax(0,1fr)] items-center gap-4 border-b border-[var(--line)] py-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:px-4">
                  <div className="relative h-14 w-full"><LabelLogo src={label.logo} name={label.name} decorative fill sizes="128px" className="object-contain object-left grayscale transition group-hover:grayscale-0" /></div>
                  <div className="min-w-0"><h2 className="truncate text-xl font-semibold sm:text-2xl">{label.name}</h2></div>
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
