"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Disc3, Music2, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlbumCard } from "@/components/features/AlbumCard";
import { TrackRow } from "@/components/features/TrackRow";
import { SearchFilterPanel } from "@/components/search/SearchFilterPanel";
import { Button } from "@/components/ui/Button";
import { MobileFilterSheet } from "@/components/ui/MobileFilterSheet";
import { useAlbums, useSearchFilters, useTracks } from "@/hooks/use-api";
import { useI18n } from "@/components/providers/I18nProvider";
import { displaySearchFilterName } from "@/lib/search-filter-labels";
import { cn } from "@/lib/utils";
import type { Album, SearchFacets, SearchFilterItem, Track, ViewMode } from "@/types";
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
  enableTrackView?: boolean;
  compactToolbarBottom?: boolean;
  separateMobileSearch?: boolean;
  accentMobileFilter?: boolean;
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

function albumFromTrack(track: Track): Album {
  return {
    id: track.albumId,
    slug: track.albumSlug,
    title: track.albumTitle || "",
    cover: track.albumCover || "/images/placeholder-album.svg",
    label: track.albumLabel || "",
    labelSlug: track.albumLabelSlug,
    code: track.albumCode || track.cdCode,
    genres: track.genres,
    moods: track.moods,
    trackCount: 0,
  };
}

export function AlbumExplorer({ initialData, fixedLabel, queryPlaceholder, headingLevel = 2, enableTrackView = false, compactToolbarBottom = false, separateMobileSearch = false, accentMobileFilter = false }: AlbumExplorerProps) {
  const { locale, t, localizedPath } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [kind, setKind] = useState<"albums" | "tracks">(
    enableTrackView && searchParams.get("kind") === "tracks" ? "tracks" : "albums",
  );
  const [sort, setSort] = useState<AlbumSort>(
    searchParams.get("sort") === "oldest" || searchParams.get("sort") === "relevance"
      ? searchParams.get("sort") as AlbumSort
      : "recent",
  );
  const [view, setView] = useState<ViewMode>(searchParams.get("view") === "list" ? "list" : "grid");
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get("page")) || 1));
  const [categories, setCategories] = useState(csv(searchParams.get("categories")));
  const [labels, setLabels] = useState(csv(searchParams.get("labels")));
  const [styles, setStyles] = useState(csv(searchParams.get("styles")));
  const [composers, setComposers] = useState<string[]>(searchParams.get("composer") ? [searchParams.get("composer")!] : []);
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
  const catalogWorkspaceRef = useRef<HTMLElement>(null);
  const filtersQuery = useSearchFilters(locale);
  const filterGroups = useMemo(
    () => (filtersQuery.data ?? []).filter((group) => !(fixedLabel && group.key === "labels")),
    [filtersQuery.data, fixedLabel],
  );
  const names = useMemo(() => new Map(filterGroups.flatMap((group) => flatten(group.items).map((item) => (
    [item.id.replace(/^-/, ""), displaySearchFilterName(group.key, item, locale)] as const
  )))), [filterGroups, locale]);
  const debouncedQuery = useDebounced(query);

  const requestParams = useMemo(() => ({
    forceSearch: true,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    query: debouncedQuery || undefined,
    labels: [...labels, ...(fixedLabel ? [fixedLabel] : [])],
    styles,
    composers,
    categories,
    minBpm: bpmRange[0] !== DEFAULT_BPM[0] ? bpmRange[0] : undefined,
    maxBpm: bpmRange[1] !== DEFAULT_BPM[1] ? bpmRange[1] : undefined,
    minDuration: durationRange[0] !== DEFAULT_DURATION[0] ? durationRange[0] : undefined,
    maxDuration: durationRange[1] !== DEFAULT_DURATION[1] ? durationRange[1] : undefined,
    language: locale,
    sort,
  }), [bpmRange, categories, composers, debouncedQuery, durationRange, fixedLabel, labels, locale, page, pageSize, sort, styles]);
  const isInitialState = !query && page === 1 && sort === "recent" && !categories.length && !labels.length && !styles.length && !composers.length
    && bpmRange[0] === DEFAULT_BPM[0] && bpmRange[1] === DEFAULT_BPM[1]
    && durationRange[0] === DEFAULT_DURATION[0] && durationRange[1] === DEFAULT_DURATION[1];
  const albumsQuery = useAlbums(requestParams, kind === "albums", isInitialState ? initialData : undefined);
  const tracksQuery = useTracks({ ...requestParams, type: "main" }, enableTrackView && kind === "tracks");
  const albums = albumsQuery.data?.albums ?? [];
  const tracks = tracksQuery.data?.tracks ?? [];
  const activeQuery = kind === "tracks" ? tracksQuery : albumsQuery;
  const facets = kind === "tracks"
    ? tracksQuery.data?.facets
    : albumsQuery.data?.facets ?? initialData.facets;
  const total = kind === "tracks"
    ? tracksQuery.data?.pagination.total ?? 0
    : albumsQuery.data?.pagination.total ?? initialData.pagination.total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const goToPage = useCallback((nextPage: number) => {
    setPage(Math.max(1, Math.min(totalPages, nextPage)));
    window.requestAnimationFrame(() => {
      const workspaceTop = catalogWorkspaceRef.current?.getBoundingClientRect().top;
      if (workspaceTop === undefined) return;
      window.scrollTo({
        top: Math.max(0, window.scrollY + workspaceTop - 74),
        behavior: "smooth",
      });
    });
  }, [totalPages]);

  useEffect(() => {
    if (mobileFiltersOpen) return;
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (enableTrackView && kind === "tracks") params.set("kind", "tracks");
    if (sort !== "recent") params.set("sort", sort);
    if (view !== "grid") params.set("view", view);
    if (page > 1) params.set("page", String(page));
    if (labels.length) params.set("labels", labels.join(","));
    if (styles.length) params.set("styles", styles.join(","));
    if (composers[0]) params.set("composer", composers[0]);
    if (categories.length) params.set("categories", categories.join(","));
    if (bpmRange[0] !== DEFAULT_BPM[0]) params.set("bpmMin", String(bpmRange[0]));
    if (bpmRange[1] !== DEFAULT_BPM[1]) params.set("bpmMax", String(bpmRange[1]));
    if (durationRange[0] !== DEFAULT_DURATION[0]) params.set("durationMin", String(durationRange[0]));
    if (durationRange[1] !== DEFAULT_DURATION[1]) params.set("durationMax", String(durationRange[1]));
    const next = params.toString();
    if (next !== searchParams.toString()) router.replace(`${pathname}${next ? `?${next}` : ""}`, { scroll: false });
  }, [bpmRange, categories, composers, durationRange, enableTrackView, kind, labels, mobileFiltersOpen, page, pathname, query, router, searchParams, sort, styles, view]);

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
    setStyles([]);
    setComposers([]);
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
    ...styles.map((value) => ({
      id: `style-${value}`,
      label: names.get(value.replace(/^-/, "")) ?? value.replace(/^-/, ""),
      group: "Style",
      state: value.startsWith("-") ? "exclude" as const : "include" as const,
      onRemove: () => removeSignedValue(setStyles, value),
    })),
    ...composers.map((value) => ({
      id: `composer-${value}`,
      label: value,
      group: locale === "fr" ? "Compositeur" : "Composer",
      state: "include" as const,
      onRemove: () => removeSignedValue(setComposers, value),
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
      styles={styles}
      composers={composers}
      bpmRange={bpmRange}
      durationRange={durationRange}
      categoryFacets={facets?.categories ?? []}
      labelFacets={facets?.labels ?? []}
      styleFacets={facets?.styles ?? []}
      locale={locale}
      onCategoriesChange={(value) => update(setCategories, value)}
      onLabelsChange={(value) => update(setLabels, value)}
      onStylesChange={(value) => update(setStyles, value)}
      onComposersChange={(value) => update(setComposers, value.slice(-1))}
      onBpmChange={(value) => update(setBpmRange, value)}
      onDurationChange={(value) => update(setDurationRange, value)}
      onReset={reset}
    />
  );
  const mobileFilterTrigger = (
    <Button
      ref={filterTriggerRef}
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setMobileFiltersOpen(true)}
      className={cn(
        "search-mobile-filter-trigger gap-2 lg:hidden",
        separateMobileSearch && "w-full justify-center",
        accentMobileFilter && "!border-[var(--signal-strong)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--signal-strong)_18%,transparent)]",
      )}
    >
      <SlidersHorizontal size={16} className={cn(accentMobileFilter && "text-[var(--signal-strong)]")} />
      {locale === "fr" ? "Tous les filtres" : "All filters"}
    </Button>
  );

  return (
    <section ref={catalogWorkspaceRef}>
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="search-desktop-filters search-filter-sticky hidden min-w-0 overflow-y-auto pb-5 lg:block">{filterPanel}</aside>
        <div className="min-w-0">
          <CatalogToolbar
            locale={locale}
            query={query}
            onQueryChange={(value) => { setQuery(value); setPage(1); }}
            queryPlaceholder={kind === "tracks"
              ? locale === "fr" ? "Rechercher une piste ou un mot-clé" : "Search a track or keyword"
              : queryPlaceholder?.[locale] ?? (locale === "fr" ? "Rechercher un titre d’album ou un mot-clé" : "Search an album title or keyword")}
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
            compactBottom={compactToolbarBottom}
            viewControlVisibility={kind === "tracks" ? "hidden" : "all"}
            separateMobileSearch={separateMobileSearch}
            mobileLeadingControl={separateMobileSearch ? mobileFilterTrigger : undefined}
            primaryControls={enableTrackView ? (
              <div className="search-view-toggle inline-flex h-12 w-fit shrink-0 items-center border border-[var(--line-strong)] bg-[var(--background)] p-1" role="group" aria-label={locale === "fr" ? "Contenu du label" : "Label content"}>
                {(["albums", "tracks"] as const).map((value) => {
                  const Icon = value === "albums" ? Disc3 : Music2;
                  const label = value === "albums" ? "Albums" : locale === "fr" ? "Pistes" : "Tracks";
                  return <button key={value} type="button" aria-pressed={kind === value} onClick={() => { setKind(value); setPage(1); }} className={cn("inline-flex h-10 items-center gap-2 px-3 text-xs font-semibold transition", kind === value ? "bg-[var(--foreground)] text-[var(--background)]" : "hover:bg-[var(--surface-soft)]")}><Icon size={15} />{label}</button>;
                })}
              </div>
            ) : undefined}
          >
            {!separateMobileSearch ? <div className="mt-2 flex flex-wrap items-center gap-2 lg:hidden">{mobileFilterTrigger}</div> : null}
            <CatalogActiveFilters locale={locale} filters={activeFilters} onReset={reset} />
          </CatalogToolbar>

          {activeQuery.isFetching && !activeQuery.data ? (
            <div className="grid min-h-72 place-items-center"><ParigoLoader size="page" label={t("common.loading")} /></div>
          ) : kind === "tracks" ? tracks.length ? (
            <div className="search-results-ledger overflow-visible border border-[var(--line-strong)] bg-[var(--surface)]">
              {tracks.map((track, index) => <TrackRow key={track.id} track={track} album={albumFromTrack(track)} queue={tracks} index={(page - 1) * pageSize + index} displayNumber={String((page - 1) * pageSize + index + 1)} showAlbumCover mobileLayout="dense" />)}
            </div>
          ) : (
            <div className="border-y border-[var(--line)] py-20 text-center"><p className="text-lg">{locale === "fr" ? "Aucune piste ne correspond à cette recherche." : "No tracks match this search."}</p><Button variant="outline" onClick={reset} className="mt-5">{t("common.reset")}</Button></div>
          ) : albums.length ? (
            <div className={cn(view === "grid" ? "grid grid-cols-1 gap-x-[var(--space-grid-x)] gap-y-[var(--space-grid-y)] sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" : "border-y border-[var(--line)]")}>
              {albums.map((album, index) => view === "grid"
                ? <AlbumCard key={album.id} album={album} headingLevel={headingLevel} priority={index === 0} />
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
            <nav className="mt-[var(--space-block-gap)] flex items-center justify-between border-t border-[var(--line)] pt-6" aria-label={locale === "fr" ? "Pagination des résultats" : "Results pagination"}>
              <Button variant="outline" disabled={page <= 1} onClick={() => goToPage(page - 1)}><ChevronLeft size={16} />{locale === "fr" ? "Précédent" : "Previous"}</Button>
              <span className="font-mono text-xs text-[var(--text-muted)]">{page} / {totalPages}</span>
              <Button variant="outline" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>{locale === "fr" ? "Suivant" : "Next"}<ChevronRight size={16} /></Button>
            </nav>
          )}
        </div>
      </div>

      {mobileFiltersOpen && (
        <MobileFilterSheet
          ref={dialogRef}
          title={locale === "fr" ? "Filtres" : "Filters"}
          ariaLabel={locale === "fr" ? "Filtres du catalogue" : "Catalogue filters"}
          closeLabel={locale === "fr" ? "Fermer les filtres" : "Close filters"}
          actionLabel={locale === "fr" ? `Afficher ${total} résultats` : `Show ${total} results`}
          onClose={() => setMobileFiltersOpen(false)}
        >
          {filterPanel}
        </MobileFilterSheet>
      )}
    </section>
  );
}
