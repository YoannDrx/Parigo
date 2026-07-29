"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlbumCard } from "@/components/features/AlbumCard";
import { SearchFilterPanel } from "@/components/search/SearchFilterPanel";
import { Button } from "@/components/ui/Button";
import { useAlbums, useSearchFilters } from "@/hooks/use-api";
import { useI18n } from "@/components/providers/I18nProvider";
import { cn } from "@/lib/utils";
import type { Album, SearchFacets, SearchFilterItem, ViewMode } from "@/types";
import { CatalogActiveFilters, type CatalogActiveFilter } from "./CatalogActiveFilters";
import { CatalogToolbar } from "./CatalogToolbar";
import { ParigoLoader } from "@/components/ui/ParigoLoader";

type AlbumSort = "relevance" | "recent" | "oldest";

interface InitialAlbums {
  albums: Album[];
  facets?: SearchFacets;
  pagination: { total: number; limit: number; offset: number; hasMore: boolean };
}

interface AlbumExplorerProps {
  initialData: InitialAlbums;
  fixedLabel?: string;
  queryPlaceholder?: { fr: string; en: string };
  headingLevel?: 2 | 3;
}

const DEFAULT_BPM: [number, number] = [50, 200];
const DEFAULT_DURATION: [number, number] = [0, 300];

function csv(value: string | null): string[] {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}

function useDebounced<T>(value: T, delay = 280): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);
  return debounced;
}

function flatten(items: SearchFilterItem[]): SearchFilterItem[] {
  return items.flatMap((item) => [item, ...flatten(item.children ?? [])]);
}

export function AlbumExplorer({ initialData, fixedLabel, queryPlaceholder, headingLevel = 2 }: AlbumExplorerProps) {
  const { locale, t, localizedPath } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [sort, setSort] = useState<AlbumSort>(
    searchParams.get("sort") === "oldest" || searchParams.get("sort") === "relevance"
      ? searchParams.get("sort") as AlbumSort
      : "recent",
  );
  const [view, setView] = useState<ViewMode>(searchParams.get("view") === "list" ? "list" : "grid");
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get("page")) || 1));
  const [categories, setCategories] = useState(csv(searchParams.get("categories")));
  const [labels, setLabels] = useState(csv(searchParams.get("labels")));
  const [bpmRange, setBpmRange] = useState<[number, number]>([
    Number(searchParams.get("bpmMin")) || DEFAULT_BPM[0],
    Number(searchParams.get("bpmMax")) || DEFAULT_BPM[1],
  ]);
  const [durationRange, setDurationRange] = useState<[number, number]>([
    Number(searchParams.get("durationMin")) || DEFAULT_DURATION[0],
    Number(searchParams.get("durationMax")) || DEFAULT_DURATION[1],
  ]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const pageSize = initialData.pagination.limit || 30;
  const dialogRef = useRef<HTMLDivElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const filtersQuery = useSearchFilters(locale);
  const filterGroups = useMemo(
    () => (filtersQuery.data ?? []).filter((group) => !(fixedLabel && group.key === "labels")),
    [filtersQuery.data, fixedLabel],
  );
  const allItems = useMemo(() => filterGroups.flatMap((group) => flatten(group.items)), [filterGroups]);
  const names = useMemo(() => new Map(allItems.map((item) => [item.id.replace(/^-/, ""), item.name])), [allItems]);
  const debouncedQuery = useDebounced(query);

  const requestParams = useMemo(() => ({
    forceSearch: true,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    query: debouncedQuery || undefined,
    labels: [...labels, ...(fixedLabel ? [fixedLabel] : [])],
    categories,
    minBpm: bpmRange[0] !== DEFAULT_BPM[0] ? bpmRange[0] : undefined,
    maxBpm: bpmRange[1] !== DEFAULT_BPM[1] ? bpmRange[1] : undefined,
    minDuration: durationRange[0] !== DEFAULT_DURATION[0] ? durationRange[0] : undefined,
    maxDuration: durationRange[1] !== DEFAULT_DURATION[1] ? durationRange[1] : undefined,
    language: locale,
    sort,
  }), [bpmRange, categories, debouncedQuery, durationRange, fixedLabel, labels, locale, page, pageSize, sort]);
  const isInitialState = !query && page === 1 && sort === "recent" && !categories.length && !labels.length
    && bpmRange[0] === DEFAULT_BPM[0] && bpmRange[1] === DEFAULT_BPM[1]
    && durationRange[0] === DEFAULT_DURATION[0] && durationRange[1] === DEFAULT_DURATION[1];
  const albumsQuery = useAlbums(requestParams, true, isInitialState ? initialData : undefined);
  const albums = albumsQuery.data?.albums ?? [];
  const facets = albumsQuery.data?.facets ?? initialData.facets;
  const total = albumsQuery.data?.pagination.total ?? initialData.pagination.total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (mobileFiltersOpen) return;
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (sort !== "recent") params.set("sort", sort);
    if (view !== "grid") params.set("view", view);
    if (page > 1) params.set("page", String(page));
    if (labels.length) params.set("labels", labels.join(","));
    if (categories.length) params.set("categories", categories.join(","));
    if (bpmRange[0] !== DEFAULT_BPM[0]) params.set("bpmMin", String(bpmRange[0]));
    if (bpmRange[1] !== DEFAULT_BPM[1]) params.set("bpmMax", String(bpmRange[1]));
    if (durationRange[0] !== DEFAULT_DURATION[0]) params.set("durationMin", String(durationRange[0]));
    if (durationRange[1] !== DEFAULT_DURATION[1]) params.set("durationMax", String(durationRange[1]));
    const next = params.toString();
    if (next !== searchParams.toString()) router.replace(`${pathname}${next ? `?${next}` : ""}`, { scroll: false });
  }, [bpmRange, categories, durationRange, labels, mobileFiltersOpen, page, pathname, query, router, searchParams, sort, view]);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const dialog = dialogRef.current;
    const trigger = filterTriggerRef.current;
    document.body.style.overflow = "hidden";
    const focusable = () => [...(dialog?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled])") ?? [])];
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileFiltersOpen(false);
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [mobileFiltersOpen]);

  const update = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    setter(value);
    setPage(1);
  }, []);
  const reset = useCallback(() => {
    setCategories([]);
    setLabels([]);
    setBpmRange(DEFAULT_BPM);
    setDurationRange(DEFAULT_DURATION);
    setPage(1);
  }, []);
  const removeSignedValue = useCallback((
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string,
  ) => {
    setter((current) => current.filter((item) => item !== value));
    setPage(1);
  }, []);
  const activeFilters: CatalogActiveFilter[] = [
    ...categories.map((value) => ({
      id: `category-${value}`,
      label: names.get(value.replace(/^-/, "")) ?? value.replace(/^-/, ""),
      group: locale === "fr" ? "Critère" : "Criterion",
      state: value.startsWith("-") ? "exclude" as const : "include" as const,
      onRemove: () => removeSignedValue(setCategories, value),
    })),
    ...labels.map((value) => ({
      id: `label-${value}`,
      label: names.get(value.replace(/^-/, "")) ?? value.replace(/^-/, ""),
      group: "Label",
      state: value.startsWith("-") ? "exclude" as const : "include" as const,
      onRemove: () => removeSignedValue(setLabels, value),
    })),
    ...(bpmRange[0] !== DEFAULT_BPM[0] || bpmRange[1] !== DEFAULT_BPM[1] ? [{
      id: "bpm",
      label: `BPM ${bpmRange[0]}–${bpmRange[1]}`,
      state: "include" as const,
      onRemove: () => update(setBpmRange, DEFAULT_BPM),
    }] : []),
    ...(durationRange[0] !== DEFAULT_DURATION[0] || durationRange[1] !== DEFAULT_DURATION[1] ? [{
      id: "duration",
      label: `${Math.floor(durationRange[0] / 60)}:${String(durationRange[0] % 60).padStart(2, "0")}–${Math.floor(durationRange[1] / 60)}:${String(durationRange[1] % 60).padStart(2, "0")}`,
      state: "include" as const,
      onRemove: () => update(setDurationRange, DEFAULT_DURATION),
    }] : []),
  ];
  const ResultHeading = `h${headingLevel}` as "h2" | "h3";

  const filterPanel = (
    <SearchFilterPanel
      groups={filterGroups}
      categories={categories}
      labels={labels}
      bpmRange={bpmRange}
      durationRange={durationRange}
      categoryFacets={facets?.categories ?? []}
      labelFacets={facets?.labels ?? []}
      locale={locale}
      onCategoriesChange={(value) => update(setCategories, value)}
      onLabelsChange={(value) => update(setLabels, value)}
      onBpmChange={(value) => update(setBpmRange, value)}
      onDurationChange={(value) => update(setDurationRange, value)}
      onReset={reset}
    />
  );

  return (
    <section>
      <CatalogToolbar
        locale={locale}
        query={query}
        onQueryChange={(value) => { setQuery(value); setPage(1); }}
        queryPlaceholder={queryPlaceholder?.[locale] ?? (locale === "fr" ? "Rechercher un album, un artiste ou un mot-clé" : "Search an album, artist or keyword")}
        sort={sort}
        onSortChange={(value) => { setSort(value); setPage(1); }}
        sortOptions={[
          { value: "recent", label: locale === "fr" ? "Plus récents" : "Newest" },
          { value: "oldest", label: locale === "fr" ? "Plus anciens" : "Oldest" },
          { value: "relevance", label: locale === "fr" ? "Pertinence" : "Relevance" },
        ]}
        view={view}
        onViewChange={setView}
        resultCount={total}
      >
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button ref={filterTriggerRef} type="button" variant="outline" size="sm" onClick={() => setMobileFiltersOpen(true)} className="gap-2 lg:hidden">
            <SlidersHorizontal size={16} />{locale === "fr" ? "Tous les filtres" : "All filters"}
          </Button>
        </div>
        <CatalogActiveFilters locale={locale} filters={activeFilters} onReset={reset} />
      </CatalogToolbar>

      <div className="grid min-w-0 gap-8 lg:grid-cols-[19rem_minmax(0,1fr)] xl:grid-cols-[21rem_minmax(0,1fr)]">
        <aside className="hidden min-w-0 lg:block">{filterPanel}</aside>
        <div className="min-w-0">
          {albumsQuery.isFetching && !albumsQuery.data ? (
            <div className="grid min-h-72 place-items-center"><ParigoLoader size="page" label={t("common.loading")} /></div>
          ) : albums.length ? (
            <div className={cn(view === "grid" ? "grid grid-cols-1 gap-x-4 gap-y-12 min-[360px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" : "border-y border-[var(--line)]")}>
              {albums.map((album, index) => view === "grid"
                ? <AlbumCard key={album.id} album={album} headingLevel={headingLevel} priority={index < 2} />
                : <Link key={album.id} href={localizedPath(`/albums/${album.slug || album.id}`)} prefetch={false} className="catalog-list-row group grid min-h-28 grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-[var(--line)] py-4 last:border-0 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:px-4">
                    <div className="relative aspect-square overflow-hidden border border-[var(--line)]"><Image src={album.cover} alt="" fill sizes="96px" className="object-cover" /></div>
                    <div className="min-w-0"><p className="truncate font-mono text-[.56rem] uppercase tracking-[.1em] text-[var(--text-muted)]">{album.label}</p><ResultHeading className="catalog-list-row__title mt-2 truncate text-lg font-semibold sm:text-2xl">{album.title}</ResultHeading><p className="mt-2 text-xs text-[var(--text-muted)]">{album.genres.slice(0, 3).join(" · ")}</p></div>
                    <span className="pr-2 font-mono text-xs text-[var(--text-muted)]">{album.trackCount} {t("catalog.tracks")}</span>
                  </Link>)}
            </div>
          ) : (
            <div className="border-y border-[var(--line)] py-20 text-center"><p className="text-lg">{t("catalog.noAlbums")}</p><Button variant="outline" onClick={reset} className="mt-5">{t("common.reset")}</Button></div>
          )}
          {totalPages > 1 && (
            <nav className="mt-12 flex items-center justify-between border-t border-[var(--line)] pt-6" aria-label={locale === "fr" ? "Pagination des albums" : "Album pagination"}>
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={16} />{locale === "fr" ? "Précédent" : "Previous"}</Button>
              <span className="font-mono text-xs text-[var(--text-muted)]">{page} / {totalPages}</span>
              <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>{locale === "fr" ? "Suivant" : "Next"}<ChevronRight size={16} /></Button>
            </nav>
          )}
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[120] bg-black/55 lg:hidden" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMobileFiltersOpen(false); }}>
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={locale === "fr" ? "Filtres du catalogue" : "Catalogue filters"} className="absolute inset-x-0 bottom-0 max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain bg-[var(--background)] p-3">
            <div className="sticky top-0 z-10 mb-2 flex items-center justify-between border border-[var(--line)] bg-[var(--background)] p-2">
              <strong className="px-2">{locale === "fr" ? "Filtres" : "Filters"}</strong>
              <button type="button" onClick={() => setMobileFiltersOpen(false)} className="grid h-11 w-11 place-items-center" aria-label={locale === "fr" ? "Fermer les filtres" : "Close filters"}><X size={19} /></button>
            </div>
            {filterPanel}
            <Button className="sticky bottom-2 mt-3 w-full" onClick={() => setMobileFiltersOpen(false)}>{locale === "fr" ? `Afficher ${total} résultats` : `Show ${total} results`}</Button>
          </div>
        </div>
      )}
    </section>
  );
}
