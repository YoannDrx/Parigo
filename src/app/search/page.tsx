"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  Disc3,
  LayoutGrid,
  Loader2,
  Minus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SearchFilterPanel } from "@/components/search/SearchFilterPanel";
import { DeferredSearchSuggestions } from "@/components/search/DeferredSearchSuggestions";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useAlbums, useSearchFilters, useTracks } from "@/hooks/use-api";
import { useI18n } from "@/components/providers/I18nProvider";
import { canonicalizeCategoryValues, findSearchFilterId, parseSearchIntent, resolveIntentCategoryIds, searchIntentChips } from "@/lib/search-intent";
import { cn, formatDuration } from "@/lib/utils";
import type { Album, SearchFacets, SearchFilterGroupKey, SearchFilterItem, Track } from "@/types";
import { useSession } from "@/lib/auth-client";

const TrackRow = dynamic(
  () => import("@/components/features/TrackRow").then((module) => module.TrackRow),
  { ssr: false, loading: () => <div className="h-20 animate-pulse border-b border-[var(--line)] bg-[var(--surface-soft)]" /> },
);

type ResultView = "tracks" | "albums";
type Density = "full" | "mid" | "light";
type SortMode = "relevance" | "recent" | "oldest" | "title" | "title-desc" | "bpm-asc" | "bpm-desc" | "duration-asc" | "duration-desc";
type VersionType = "main" | "all";
type SearchMode = "intent" | "exact";

const PAGE_SIZE = 30;
const DEFAULT_BPM: [number, number] = [50, 200];
const DEFAULT_DURATION: [number, number] = [0, 300];
function stripQuotes(value: string): string {
  return value.replace(/^["']+|["']+$/g, "");
}

function csv(value: string | null): string[] {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}

function categoryId(value: string): string | null {
  const negative = value.startsWith("-");
  const raw = negative ? value.slice(1) : value;
  const withoutPrefix = raw.replace(/^ATT_/i, "");
  const opaque = withoutPrefix.split("_")[0];
  if (!/^[a-z0-9-]{8,}$/i.test(opaque)) return null;
  return `${negative ? "-" : ""}ATT_${opaque}`;
}

function sorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.replace(/^-/, "").localeCompare(b.replace(/^-/, "")) || a.localeCompare(b));
}

function flatten(items: SearchFilterItem[]): SearchFilterItem[] {
  return items.flatMap((item) => [item, ...flatten(item.children ?? [])]);
}

function albumFromTrack(track: Track): Album {
  return {
    id: track.albumId,
    slug: track.albumSlug,
    title: track.albumTitle || "",
    cover: track.albumCover || "/images/placeholder-album.jpg",
    label: track.albumLabel || "Parigo",
    labelSlug: track.albumLabelSlug,
    genres: track.genres,
    moods: track.moods,
    trackCount: 0,
  };
}

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);
  return debounced;
}

function SearchContent() {
  const { locale, t, localizedPath } = useI18n();
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = stripQuotes(searchParams.get("q") ?? searchParams.get("keyword") ?? "");
  const initialBrief = stripQuotes(searchParams.get("brief") ?? "");
  const shouldResolveInitialBrief = searchParams.get("resolve") === "1";
  const legacyEntries = useMemo(() => ([
    ["category", null],
    ["genre", "genre"],
    ["mood", "moods"],
    ["instrument", "instruments"],
  ] as const).flatMap(([param, group]) => searchParams.getAll(param).flatMap(csv).map((value) => ({ value, group }))), [searchParams]);
  const legacyRaw = useMemo(() => legacyEntries.map(({ value }) => value), [legacyEntries]);

  const [query, setQuery] = useState(initialQuery);
  const [brief, setBrief] = useState(initialBrief);
  const [queryDraft, setQueryDraft] = useState(initialBrief || initialQuery);
  const [searchMode, setSearchMode] = useState<SearchMode>(initialBrief || !initialQuery ? "intent" : "exact");
  const [intentResolutionPending, setIntentResolutionPending] = useState(Boolean(initialBrief && shouldResolveInitialBrief));
  const [view, setView] = useState<ResultView>(searchParams.get("view") === "albums" ? "albums" : "tracks");
  const [type, setType] = useState<VersionType>(searchParams.get("type") === "all" ? "all" : "main");
  const [density, setDensity] = useState<Density>(searchParams.get("density") === "mid" || searchParams.get("density") === "light" ? searchParams.get("density") as Density : "full");
  const [sort, setSort] = useState<SortMode>((searchParams.get("sort") as SortMode) || "relevance");
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get("page")) || 1));
  const [categories, setCategories] = useState<string[]>(sorted([
    ...csv(searchParams.get("categories")),
    ...legacyRaw,
  ].map(categoryId).filter((value): value is string => Boolean(value))));
  const [labels, setLabels] = useState<string[]>(sorted(csv(searchParams.get("labels") ?? searchParams.get("label")).filter((value) => !value.startsWith("-"))));
  const [styles, setStyles] = useState<string[]>(sorted(csv(searchParams.get("styles"))));
  const [bpmRange, setBpmRange] = useState<[number, number]>([
    Number(searchParams.get("bpmMin") ?? searchParams.get("minBpm")) || DEFAULT_BPM[0],
    Number(searchParams.get("bpmMax") ?? searchParams.get("maxBpm")) || DEFAULT_BPM[1],
  ]);
  const [durationRange, setDurationRange] = useState<[number, number]>([
    Number(searchParams.get("durationMin") ?? searchParams.get("minDuration")) || DEFAULT_DURATION[0],
    Number(searchParams.get("durationMax") ?? searchParams.get("maxDuration")) || DEFAULT_DURATION[1],
  ]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [saveSearchOpen, setSaveSearchOpen] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");
  const [saveSearchState, setSaveSearchState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dialogRef = useRef<HTMLDivElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);

  const filtersQuery = useSearchFilters(locale);
  const filterGroups = useMemo(() => filtersQuery.data ?? [], [filtersQuery.data]);
  const allFilterItems = useMemo(() => filterGroups.flatMap((group) => flatten(group.items)), [filterGroups]);
  const itemNames = useMemo(() => new Map(allFilterItems.map((item) => [item.id, item.name])), [allFilterItems]);

  useEffect(() => {
    if (!filterGroups.length) return;
    const frame = window.requestAnimationFrame(() => setCategories((current) => {
      const canonical = canonicalizeCategoryValues(current, filterGroups);
      return canonical.join(",") === current.join(",") ? current : canonical;
    }));
    return () => window.cancelAnimationFrame(frame);
  }, [filterGroups]);

  useEffect(() => {
    if (!allFilterItems.length) return;
    const names = new Map<string, string>();
    allFilterItems.forEach((item) => {
      const key = item.name.toLocaleLowerCase(locale);
      if (!names.has(key)) names.set(key, item.id);
    });
    const resolved = legacyEntries.flatMap(({ value, group }) => {
      const canonical = categoryId(value);
      if (canonical) return [canonical];
      const unsigned = value.replace(/^-/, "");
      const id = group
        ? findSearchFilterId(filterGroups, group as SearchFilterGroupKey, unsigned)
        : names.get(unsigned.toLocaleLowerCase(locale));
      return id ? [`${value.startsWith("-") ? "-" : ""}${id}`] : [];
    });
    if (!resolved.length) return;
    const frame = window.requestAnimationFrame(() => setCategories((current) => sorted([...current, ...resolved])));
    return () => window.cancelAnimationFrame(frame);
  }, [allFilterItems, filterGroups, legacyEntries, locale]);

  useEffect(() => {
    if (!intentResolutionPending || !brief || !filterGroups.length) return;
    const intent = parseSearchIntent(brief);
    const detectedIds = resolveIntentCategoryIds(intent, filterGroups);
    const hasResolvedCriteria = Boolean(detectedIds.length || intent.bpmRange);
    const frame = window.requestAnimationFrame(() => {
      setQuery(hasResolvedCriteria ? "" : brief);
      setCategories(sorted(detectedIds));
      setBpmRange(intent.bpmRange
        ? [Math.max(DEFAULT_BPM[0], intent.bpmRange[0]), Math.min(DEFAULT_BPM[1], intent.bpmRange[1])]
        : DEFAULT_BPM);
      setIntentResolutionPending(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [brief, filterGroups, intentResolutionPending]);

  useEffect(() => {
    if (!intentResolutionPending || !brief || !filtersQuery.isError) return;
    const frame = window.requestAnimationFrame(() => {
      setQuery(brief);
      setIntentResolutionPending(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [brief, filtersQuery.isError, intentResolutionPending]);

  const updateCategories = useCallback((values: string[]) => { setCategories(sorted(values)); setPage(1); }, []);
  const updateLabels = useCallback((values: string[]) => { setLabels(sorted(values)); setPage(1); }, []);
  const updateStyles = useCallback((values: string[]) => { setStyles(sorted(values)); setPage(1); }, []);
  const updateBpm = useCallback((value: [number, number]) => { setBpmRange(value); setPage(1); }, []);
  const updateDuration = useCallback((value: [number, number]) => { setDurationRange(value); setPage(1); }, []);

  useEffect(() => {
    // On mobile the filter sheet is an explicit apply surface. Deferring the URL
    // replacement keeps the focus trap and scroll position stable while users
    // make several selections; closing the sheet commits the canonical URL.
    if (mobileFiltersOpen) return;
    const params = new URLSearchParams();
    if (brief) params.set("brief", brief);
    if (query) params.set("q", query);
    params.set("view", view);
    params.set("type", type);
    if (page > 1) params.set("page", String(page));
    if (sort !== "relevance") params.set("sort", sort);
    if (density !== "full") params.set("density", density);
    if (labels.length) params.set("labels", sorted(labels).join(","));
    if (styles.length) params.set("styles", sorted(styles).join(","));
    if (categories.length) params.set("categories", sorted(categories).join(","));
    if (bpmRange[0] !== DEFAULT_BPM[0]) params.set("bpmMin", String(bpmRange[0]));
    if (bpmRange[1] !== DEFAULT_BPM[1]) params.set("bpmMax", String(bpmRange[1]));
    if (durationRange[0] !== DEFAULT_DURATION[0]) params.set("durationMin", String(durationRange[0]));
    if (durationRange[1] !== DEFAULT_DURATION[1]) params.set("durationMax", String(durationRange[1]));
    const next = params.toString();
    if (next !== searchParams.toString()) router.replace(`/search${next ? `?${next}` : ""}`, { scroll: false });
  }, [bpmRange, brief, categories, density, durationRange, labels, mobileFiltersOpen, page, query, router, searchParams, sort, styles, type, view]);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const trigger = mobileTriggerRef.current;
    const dialog = dialogRef.current;
    document.body.style.overflow = "hidden";
    const focusable = () => [...(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])];
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

  const resetFilters = useCallback(() => {
    setCategories([]);
    setLabels([]);
    setStyles([]);
    setBpmRange(DEFAULT_BPM);
    setDurationRange(DEFAULT_DURATION);
    setType("main");
    setPage(1);
  }, []);

  const requestParams = useMemo(() => ({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    query: query || undefined,
    labels,
    styles,
    categories,
    minBpm: bpmRange[0] !== DEFAULT_BPM[0] ? bpmRange[0] : undefined,
    maxBpm: bpmRange[1] !== DEFAULT_BPM[1] ? bpmRange[1] : undefined,
    minDuration: durationRange[0] !== DEFAULT_DURATION[0] ? durationRange[0] : undefined,
    maxDuration: durationRange[1] !== DEFAULT_DURATION[1] ? durationRange[1] : undefined,
    type,
    language: locale,
    sort,
  }), [bpmRange, categories, durationRange, labels, locale, page, query, sort, styles, type]);
  const debouncedParams = useDebounced(requestParams, 300);
  const tracksQuery = useTracks(debouncedParams, view === "tracks" && !intentResolutionPending);
  const albumsQuery = useAlbums({ ...debouncedParams, forceSearch: true, sort }, view === "albums" && !intentResolutionPending);
  const activeQuery = view === "tracks" ? tracksQuery : albumsQuery;
  const tracks = tracksQuery.data?.tracks ?? [];
  const albums = albumsQuery.data?.albums ?? [];
  const total = view === "tracks" ? tracksQuery.data?.pagination.total ?? 0 : albumsQuery.data?.pagination.total ?? 0;
  const facets: SearchFacets | undefined = view === "tracks" ? tracksQuery.data?.facets : albumsQuery.data?.facets;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const searchHistoryId = view === "tracks" ? tracksQuery.data?.searchHistoryId : albumsQuery.data?.searchHistoryId;

  const draftIntent = useMemo(() => parseSearchIntent(searchMode === "intent" ? queryDraft : ""), [queryDraft, searchMode]);
  const draftIntentChips = useMemo(() => searchIntentChips(draftIntent, locale), [draftIntent, locale]);
  const hasTaxonomyIntent = Boolean(draftIntent.genres.length || draftIntent.moods.length || draftIntent.instruments.length);

  const applyUnifiedSearch = () => {
    const value = queryDraft.trim();
    if (!value) return;
    setPage(1);
    setLabels([]);
    setStyles([]);
    setDurationRange(DEFAULT_DURATION);
    setType("main");

    if (searchMode === "exact") {
      setBrief("");
      setQuery(value);
      setCategories([]);
      setBpmRange(DEFAULT_BPM);
      setIntentResolutionPending(false);
      return;
    }

    const detectedIds = filterGroups.length ? resolveIntentCategoryIds(draftIntent, filterGroups) : [];
    const waitingForTaxonomy = hasTaxonomyIntent && !filterGroups.length;
    const hasResolvedCriteria = Boolean(detectedIds.length || draftIntent.bpmRange);
    setBrief(value);
    setQuery(waitingForTaxonomy || hasResolvedCriteria ? "" : value);
    setCategories(sorted(detectedIds));
    setBpmRange(draftIntent.bpmRange
      ? [Math.max(DEFAULT_BPM[0], draftIntent.bpmRange[0]), Math.min(DEFAULT_BPM[1], draftIntent.bpmRange[1])]
      : DEFAULT_BPM);
    setIntentResolutionPending(waitingForTaxonomy);
  };

  const clearUnifiedSearch = () => {
    setQueryDraft("");
    setQuery("");
    setBrief("");
    setIntentResolutionPending(false);
    resetFilters();
  };

  const activeValues = [...categories, ...styles];
  const includedCount = activeValues.filter((value) => !value.startsWith("-")).length + labels.length;
  const excludedCount = activeValues.filter((value) => value.startsWith("-")).length;
  const resultStart = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const resultEnd = Math.min(page * PAGE_SIZE, total);
  const removeValue = (value: string, source: "categories" | "styles" | "labels") => {
    const setter = source === "categories" ? updateCategories : source === "styles" ? updateStyles : updateLabels;
    setter((source === "categories" ? categories : source === "styles" ? styles : labels).filter((item) => item !== value));
  };
  const addSuggestion = (suggestion: string) => {
    const terms = query.match(/"[^"]+"|\S+/g)?.map((term) => stripQuotes(term)) ?? [];
    const nextQuery = [...terms, suggestion].filter((term, index, all) => all.findIndex((candidate) => candidate.toLocaleLowerCase() === term.toLocaleLowerCase()) === index).map((term) => `"${term}"`).join(" ");
    setBrief("");
    setSearchMode("exact");
    setIntentResolutionPending(false);
    setQuery(nextQuery);
    setQueryDraft(nextQuery);
    setPage(1);
  };

  const openSaveSearch = () => {
    const fallback = (brief || query).replaceAll('"', "").trim() || (locale === "fr" ? "Ma recherche Parigo" : "My Parigo search");
    setSaveSearchName(fallback.slice(0, 160));
    setSaveSearchState("idle");
    setSaveSearchOpen(true);
  };

  const saveCurrentSearch = async () => {
    if (!searchHistoryId || !saveSearchName.trim()) return;
    setSaveSearchState("saving");
    const searchUrl = `${window.location.pathname}${window.location.search}`;
    const response = await fetch("/api/user/searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: saveSearchName.trim(), searchHistoryId, searchUrl }),
    });
    setSaveSearchState(response.ok ? "saved" : "error");
    if (response.ok) window.setTimeout(() => setSaveSearchOpen(false), 900);
  };

  const filterPanel = (
    <SearchFilterPanel
      groups={filterGroups}
      categories={categories}
      labels={labels}
      styles={styles}
      bpmRange={bpmRange}
      durationRange={durationRange}
      categoryFacets={facets?.categories ?? []}
      labelFacets={facets?.labels ?? []}
      styleFacets={facets?.styles ?? []}
      locale={locale}
      onCategoriesChange={updateCategories}
      onLabelsChange={updateLabels}
      onStylesChange={updateStyles}
      onBpmChange={updateBpm}
      onDurationChange={updateDuration}
      onReset={resetFilters}
    />
  );

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-28 pt-28 md:pt-32">
        <section className="border-b border-[var(--line)] px-4 pb-7 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1800px]">
            <div className="grid items-end gap-6 lg:grid-cols-[minmax(240px,.45fr)_minmax(0,1fr)]">
              <div>
                <p className="eyebrow mb-3 text-[var(--signal-strong)]">{locale === "fr" ? "Catalogue Parigo" : "Parigo catalogue"}</p>
                <h1 className="text-[clamp(2.8rem,5vw,5.5rem)] leading-[.92] tracking-[-.06em]">{locale === "fr" ? "Trouver la bonne musique." : "Find the right music."}</h1>
              </div>
              <div>
                <form onSubmit={(event) => { event.preventDefault(); applyUnifiedSearch(); }} className="ai-search-shell search-query-frame flex min-h-16 items-center border border-[var(--line-strong)] bg-[var(--surface)] p-1.5 transition">
                  {searchMode === "intent" ? <Sparkles size={20} className="ml-3 shrink-0 text-[var(--signal-strong)]" /> : <Search size={20} className="ml-3 shrink-0 text-[var(--signal-strong)]" />}
                  <label htmlFor="catalog-search" className="sr-only">{searchMode === "intent" ? (locale === "fr" ? "Décrivez votre intention musicale" : "Describe your music brief") : (locale === "fr" ? "Rechercher un titre, un album ou un compositeur" : "Search for a title, album or composer")}</label>
                  <input id="catalog-search" value={queryDraft} onChange={(event) => setQueryDraft(event.target.value)} maxLength={500} placeholder={searchMode === "intent" ? (locale === "fr" ? "Une techno énergique entre 120 et 140 BPM…" : "Energetic techno between 120 and 140 BPM…") : (locale === "fr" ? "Titre, album, compositeur ou mot-clé exact…" : "Title, album, composer or exact keyword…")} className="ai-search-input min-w-0 flex-1 bg-transparent px-3 py-3 text-base outline-none" />
                  {queryDraft && <button type="button" onClick={clearUnifiedSearch} className="flex h-10 w-10 items-center justify-center hover:bg-[var(--surface-soft)]" aria-label={locale === "fr" ? "Effacer la recherche" : "Clear search"}><X size={16} /></button>}
                  <Button type="submit" size="sm" disabled={!queryDraft.trim() || intentResolutionPending} aria-label={searchMode === "intent" ? (locale === "fr" ? "Interpréter et rechercher" : "Interpret and search") : t("common.search")}><span className="hidden sm:inline">{intentResolutionPending ? (locale === "fr" ? "Interprétation…" : "Interpreting…") : t("common.search")}</span>{intentResolutionPending ? <Loader2 className="animate-spin sm:hidden" size={17} /> : <ChevronRight className="sm:hidden" size={17} />}</Button>
                </form>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div data-testid="search-interpretation" className="flex min-h-9 flex-1 flex-wrap items-center gap-2 text-[var(--text-muted)]" aria-live="polite">
                    {searchMode === "intent" ? <>
                      <span className="eyebrow">{locale === "fr" ? "Interprétation" : "Interpretation"}</span>
                      {draftIntentChips.map((chip) => <span key={chip.key} className="search-chip search-chip--included px-2.5 py-1 text-xs text-[var(--foreground)]">{chip.label}</span>)}
                      {draftIntent.isVocal !== null && <span className="search-chip border-dashed px-2.5 py-1 text-xs">{locale === "fr" ? "Voix détectée · filtre bientôt disponible" : "Vocals detected · filter coming soon"}</span>}
                      {queryDraft.trim() && !draftIntentChips.length && draftIntent.isVocal === null && <span className="text-xs">{locale === "fr" ? "Aucun critère structuré détecté : recherche par mots-clés." : "No structured criteria detected: keyword search."}</span>}
                      {!queryDraft.trim() && <span className="text-xs">{locale === "fr" ? "Les critères compris apparaîtront ici avant la recherche." : "Recognised criteria will appear here before searching."}</span>}
                    </> : <span className="text-xs">{locale === "fr" ? "Recherche littérale dans les titres, albums, compositeurs et métadonnées." : "Literal search across titles, albums, composers and metadata."}</span>}
                  </div>
                  <button type="button" onClick={() => setSearchMode((current) => current === "intent" ? "exact" : "intent")} className="inline-flex min-h-9 shrink-0 items-center gap-2 self-start border-b border-[var(--line-strong)] text-xs font-semibold text-[var(--text-muted)] transition hover:border-[var(--signal-strong)] hover:text-[var(--signal-strong)]">
                    {searchMode === "intent" ? <Search size={13} /> : <Sparkles size={13} />}
                    {searchMode === "intent" ? (locale === "fr" ? "Rechercher un titre précis" : "Search for an exact title") : (locale === "fr" ? "Décrire une intention" : "Describe a brief")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-[1800px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:px-8">
          <aside className="sticky top-24 hidden h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain pb-5 lg:block" aria-label={locale === "fr" ? "Filtres de recherche" : "Search filters"}>
            {filtersQuery.isLoading ? <div className="flex min-h-52 items-center justify-center rounded-xl border border-[var(--line)]"><Loader2 className="animate-spin" /></div> : filterPanel}
          </aside>

          <section className="min-w-0" aria-live="polite">
            <div className="search-toolbar mb-4 flex flex-wrap items-stretch justify-between gap-3 border border-[var(--line-strong)] bg-[var(--surface)] p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <button ref={mobileTriggerRef} type="button" onClick={() => setMobileFiltersOpen(true)} className="inline-flex min-h-11 items-center gap-2 border border-[var(--line-strong)] px-3 text-xs font-semibold lg:hidden"><SlidersHorizontal size={15} />{locale === "fr" ? "Filtres" : "Filters"}{includedCount + excludedCount > 0 && <span className="bg-[var(--signal-strong)] px-1.5 font-mono text-white">{includedCount + excludedCount}</span>}</button>
                <div className="search-view-toggle inline-flex border border-[var(--line-strong)] p-1" role="group" aria-label={locale === "fr" ? "Type de résultats" : "Result type"}>
                  <button type="button" aria-pressed={view === "tracks"} onClick={() => { setView("tracks"); setPage(1); }} className={cn("min-h-10 px-3 text-xs font-semibold transition", view === "tracks" && "bg-[var(--foreground)] text-[var(--background)]")}><Disc3 size={14} className="mr-1.5 inline" />{locale === "fr" ? "Pistes" : "Tracks"}</button>
                  <button type="button" aria-pressed={view === "albums"} onClick={() => { setView("albums"); setPage(1); }} className={cn("min-h-10 px-3 text-xs font-semibold transition", view === "albums" && "bg-[var(--foreground)] text-[var(--background)]")}><LayoutGrid size={14} className="mr-1.5 inline" />Albums</button>
                </div>
                <Select variant="editorial" caption={locale === "fr" ? "Versions" : "Versions"} value={type} onValueChange={(value) => { setType(value); setPage(1); }} ariaLabel={locale === "fr" ? "Versions des pistes" : "Track versions"} className="min-w-[11.5rem]" options={[{ value: "main", label: locale === "fr" ? "Versions principales" : "Main versions" }, { value: "all", label: locale === "fr" ? "Toutes les versions" : "All versions" }]} />
              </div>
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
                <Select variant="editorial" caption={locale === "fr" ? "Affichage" : "Display"} value={density} onValueChange={setDensity} ariaLabel={locale === "fr" ? "Densité des pistes" : "Track density"} className="min-w-0 sm:min-w-[9.5rem]" options={[{ value: "full", label: locale === "fr" ? "Piste complète" : "Full track" }, { value: "mid", label: locale === "fr" ? "Mi-piste" : "Medium track" }, { value: "light", label: locale === "fr" ? "Piste légère" : "Light track" }]} />
                <Select variant="editorial" caption={locale === "fr" ? "Ordre" : "Order"} value={sort} onValueChange={(value) => { setSort(value); setPage(1); }} ariaLabel={locale === "fr" ? "Trier les résultats" : "Sort results"} className="min-w-0 sm:min-w-[9rem]" options={[
                  { value: "relevance", label: locale === "fr" ? "Pertinence" : "Relevance" },
                  { value: "recent", label: locale === "fr" ? "Plus récents" : "Newest" },
                  { value: "oldest", label: locale === "fr" ? "Plus anciens" : "Oldest" },
                  { value: "title", label: "A–Z" }, { value: "title-desc", label: "Z–A" },
                  ...(view === "tracks" ? [{ value: "bpm-asc" as const, label: "BPM ↑" }, { value: "bpm-desc" as const, label: "BPM ↓" }, { value: "duration-asc" as const, label: locale === "fr" ? "Durée ↑" : "Duration ↑" }, { value: "duration-desc" as const, label: locale === "fr" ? "Durée ↓" : "Duration ↓" }] : []),
                ]} />
              </div>
            </div>

            {(categories.length > 0 || labels.length > 0 || styles.length > 0 || bpmRange[0] !== 50 || bpmRange[1] !== 200 || durationRange[0] !== 0 || durationRange[1] !== 300) && (
              <div className="search-active-filters mb-4 border border-[var(--line-strong)] bg-[var(--background)] p-3">
                <div className="mb-3 flex items-center justify-between gap-4"><p className="font-mono text-[.62rem] font-semibold uppercase tracking-[.1em]">{locale === "fr" ? `${includedCount} inclus · ${excludedCount} exclus` : `${includedCount} included · ${excludedCount} excluded`}</p><button type="button" onClick={resetFilters} className="inline-flex min-h-9 items-center gap-2 border border-[var(--line)] bg-[var(--surface)] px-3 text-[.68rem] font-semibold transition hover:border-[var(--signal-strong)] hover:text-[var(--signal-strong)]"><RotateCcw size={12} />{locale === "fr" ? "Tout effacer" : "Clear all"}</button></div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((value) => { const id = value.replace(/^-/, ""); const negative = value.startsWith("-"); return <button key={value} type="button" onClick={() => removeValue(value, "categories")} className={cn("search-chip inline-flex min-h-9 items-center gap-1.5 px-3 text-xs", negative ? "search-chip--excluded filter-chip-excluded" : "search-chip--included")}><span className={cn("search-chip__mark flex h-4 w-4 items-center justify-center", negative ? "bg-[var(--danger)] text-white" : "bg-[var(--signal-strong)] text-white")}>{negative ? <Minus size={10} /> : <Check size={10} />}</span>{itemNames.get(id) ?? id}<X size={12} /></button>; })}
                  {labels.map((value) => <button key={value} type="button" onClick={() => removeValue(value, "labels")} className="search-chip search-chip--included inline-flex min-h-9 items-center gap-1.5 px-3 text-xs"><span className="search-chip__mark flex h-4 w-4 items-center justify-center bg-[var(--signal-strong)] text-white"><Check size={10} /></span>{itemNames.get(value) ?? value}<X size={12} /></button>)}
                  {styles.map((value) => { const id = value.replace(/^-/, ""); const negative = value.startsWith("-"); return <button key={value} type="button" onClick={() => removeValue(value, "styles")} className={cn("search-chip inline-flex min-h-9 items-center gap-1.5 px-3 text-xs", negative ? "search-chip--excluded filter-chip-excluded" : "search-chip--included")} ><span className={cn("search-chip__mark flex h-4 w-4 items-center justify-center", negative ? "bg-[var(--danger)] text-white" : "bg-[var(--signal-strong)] text-white")}>{negative ? <Minus size={10} /> : <Check size={10} />}</span>{itemNames.get(id) ?? id}<X size={12} /></button>; })}
                  {(bpmRange[0] !== 50 || bpmRange[1] !== 200) && <button type="button" onClick={() => updateBpm(DEFAULT_BPM)} className="search-chip inline-flex min-h-9 items-center gap-1.5 px-3 font-mono text-xs">BPM {bpmRange[0]}–{bpmRange[1]}<X size={12} /></button>}
                  {(durationRange[0] !== 0 || durationRange[1] !== 300) && <button type="button" onClick={() => updateDuration(DEFAULT_DURATION)} className="search-chip inline-flex min-h-9 items-center gap-1.5 px-3 font-mono text-xs">{formatDuration(durationRange[0])}–{formatDuration(durationRange[1])}<X size={12} /></button>}
                </div>
              </div>
            )}

            <div className="mb-4 flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3 text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-3"><span>{intentResolutionPending || activeQuery.isFetching ? (locale === "fr" ? "Recherche…" : "Searching…") : `${resultStart}–${resultEnd} / ${total.toLocaleString(locale)}`}</span>{session?.user && <button type="button" onClick={openSaveSearch} disabled={!searchHistoryId || intentResolutionPending || activeQuery.isFetching} className="inline-flex min-h-9 items-center gap-2 border-l border-[var(--line)] pl-3 font-semibold text-[var(--foreground)] transition hover:text-[var(--signal-strong)] disabled:cursor-not-allowed disabled:opacity-35"><BookmarkPlus size={14} />{locale === "fr" ? "Sauvegarder" : "Save"}</button>}</div>
              {(brief || query) && <span>{brief ? (locale === "fr" ? "Brief interprété" : "Interpreted brief") : (locale === "fr" ? "Résultats pour" : "Results for")} « {brief || query} »</span>}
            </div>

            {saveSearchOpen && <div className="mb-4 grid gap-3 border border-[var(--line-strong)] bg-[var(--surface)] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><label className="text-xs font-semibold"><span className="mb-2 block">{locale === "fr" ? "Nom de la recherche" : "Search name"}</span><input autoFocus value={saveSearchName} onChange={(event) => { setSaveSearchName(event.target.value); setSaveSearchState("idle"); }} maxLength={160} className="min-h-11 w-full border border-[var(--line)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--foreground)]" /></label><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => setSaveSearchOpen(false)}>{locale === "fr" ? "Annuler" : "Cancel"}</Button><Button size="sm" disabled={!saveSearchName.trim() || !searchHistoryId || saveSearchState === "saving"} onClick={() => void saveCurrentSearch()}>{saveSearchState === "saving" ? <Loader2 className="animate-spin" size={14} /> : <BookmarkPlus size={14} />}{saveSearchState === "saved" ? (locale === "fr" ? "Sauvegardée" : "Saved") : (locale === "fr" ? "Enregistrer" : "Save")}</Button></div>{saveSearchState === "error" && <p className="text-xs text-[var(--danger)] sm:col-span-2">{locale === "fr" ? "La recherche n’a pas pu être sauvegardée." : "The search could not be saved."}</p>}</div>}

            {!activeQuery.isError && (
              <DeferredSearchSuggestions locale={locale} onSelect={addSuggestion} />
            )}

            {intentResolutionPending || activeQuery.isLoading || activeQuery.isFetching && !activeQuery.data ? (
              <div className="flex min-h-96 items-center justify-center"><Loader2 className="animate-spin text-[var(--signal-strong)]" size={32} /><span className="sr-only">{t("common.loading")}</span></div>
            ) : activeQuery.isError ? (
              <div className="rounded-xl border border-[var(--line)] px-5 py-24 text-center"><h2 className="text-3xl">{locale === "fr" ? "La recherche est temporairement indisponible." : "Search is temporarily unavailable."}</h2><p className="mt-3 text-sm text-[var(--text-muted)]">{locale === "fr" ? "Réessayez dans quelques instants." : "Please try again in a moment."}</p><Button variant="outline" onClick={() => activeQuery.refetch()} className="mt-7">{t("common.retry")}</Button></div>
            ) : view === "tracks" ? tracks.length ? (
              <div className="search-results-ledger overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)]">
                <div className="search-results-ledger__header hidden min-h-10 items-center justify-between gap-6 border-b border-[var(--line-strong)] px-4 font-mono text-[.54rem] uppercase tracking-[.12em] text-[var(--text-muted)] xl:flex">
                  <span>{locale === "fr" ? "Piste · album · waveform" : "Track · album · waveform"}</span>
                  <span>{locale === "fr" ? "Couleurs · tempo · durée · actions" : "Colours · tempo · duration · actions"}</span>
                </div>
                {tracks.map((track, index) => <TrackRow key={track.id} track={track} album={albumFromTrack(track)} queue={tracks} index={(page - 1) * PAGE_SIZE + index} showAlbumCover compact={density !== "full"} density={density} />)}
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--line)] px-5 py-24 text-center"><h2 className="text-4xl">{t("search.emptyTitle")}</h2><p className="mx-auto mt-4 max-w-xl text-sm text-[var(--text-muted)]">{t("search.emptyCopy")}</p><Button variant="outline" onClick={resetFilters} className="mt-6">{t("common.reset")}</Button></div>
            ) : albums.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{albums.map((album, index) => <article key={album.id} style={{ animationDelay: `${index * 18}ms` }} className="parigo-card animate-[fade-in_.25s_ease-out_both] border border-[var(--line)] bg-[var(--surface)] p-2.5"><Link href={localizedPath(`/albums/${album.slug || album.id}`)} className="group block"><div className="media-frame relative aspect-square overflow-hidden bg-[var(--surface-soft)]"><Image src={album.cover} alt={album.title} fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 20vw" className="object-contain transition duration-700 group-hover:scale-[1.025]" /></div><div className="flex items-start justify-between gap-3 py-3"><div className="min-w-0"><h2 className="truncate text-base tracking-[-.025em]">{album.title}</h2><p className="mt-1 truncate text-[.68rem] text-[var(--text-muted)]">{album.label}</p></div><span className="font-mono text-[.55rem] opacity-40">{String(index + 1).padStart(2, "0")}</span></div></Link></article>)}</div>
            ) : (
              <div className="rounded-xl border border-[var(--line)] px-5 py-24 text-center"><h2 className="text-4xl">{t("search.emptyTitle")}</h2><Button variant="outline" onClick={resetFilters} className="mt-6">{t("common.reset")}</Button></div>
            )}

            {!activeQuery.isLoading && !activeQuery.isError && totalPages > 1 && (
              <nav className="mt-7 flex items-center justify-between border-t border-[var(--line)] pt-5" aria-label={locale === "fr" ? "Pagination des résultats" : "Results pagination"}>
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setPage((value) => Math.max(1, value - 1)); window.scrollTo({ top: 330, behavior: "smooth" }); }}><ChevronLeft size={16} />{locale === "fr" ? "Précédent" : "Previous"}</Button>
                <span className="font-mono text-[.65rem] uppercase tracking-[.12em] text-[var(--text-muted)]">Page {page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => { setPage((value) => Math.min(totalPages, value + 1)); window.scrollTo({ top: 330, behavior: "smooth" }); }}>{locale === "fr" ? "Suivant" : "Next"}<ChevronRight size={16} /></Button>
              </nav>
            )}
          </section>
        </div>
      </main>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true" aria-labelledby="mobile-filter-title">
          <button type="button" className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)} aria-label={t("common.close")} />
          <div ref={dialogRef} className="parigo-drawer parigo-drawer--bottom absolute inset-0 flex animate-[fade-in_.3s_ease-out_both] flex-col bg-[var(--background)] sm:inset-x-4 sm:bottom-4 sm:top-10">
            <div className="flex min-h-16 items-center justify-between border-b border-[var(--line)] px-4"><h2 id="mobile-filter-title" className="font-semibold">{locale === "fr" ? "Filtres" : "Filters"}</h2><button type="button" onClick={() => setMobileFiltersOpen(false)} className="flex h-11 w-11 items-center justify-center border border-[var(--line)]" aria-label={t("common.close")}><X size={17} /></button></div>
            <div className="relative z-0 min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3">{filterPanel}</div>
            <div className="relative z-20 shrink-0 border-t border-[var(--line)] bg-[var(--background)] p-3"><Button className="w-full" onClick={() => setMobileFiltersOpen(false)}>{locale === "fr" ? `Voir ${total.toLocaleString(locale)} résultats` : `View ${total.toLocaleString(locale)} results`}</Button></div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin text-[var(--signal-strong)]" size={32} /></div>}><SearchContent /></Suspense>;
}
