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
import { Button } from "@/components/ui/Button";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { Select } from "@/components/ui/Select";
import { useAlbums, useSearchFilters, useTracks } from "@/hooks/use-api";
import { useI18n } from "@/components/providers/I18nProvider";
import { canonicalizeCategoryValues, findSearchFilterId, parseSearchIntent, searchIntentChips } from "@/lib/search-intent";
import { cn, formatDuration } from "@/lib/utils";
import type { Album, SearchFacets, SearchFilterGroupKey, SearchFilterItem, SortMode, Track } from "@/types";
import { useSession } from "@/lib/auth-client";

const TrackRow = dynamic(
  () => import("@/components/features/TrackRow").then((module) => module.TrackRow),
  { ssr: false, loading: () => <div className="grid min-h-20 place-items-center border-b border-[var(--line)] bg-[var(--surface-soft)]"><ParigoLoader size="compact" /></div> },
);

type ResultView = "tracks" | "albums";
type Density = "full" | "mid" | "light";
type VersionType = "main" | "all";
type SearchMode = "intent" | "title";

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
    cover: track.albumCover || "/images/placeholder-album.svg",
    label: track.albumLabel || "Parigo",
    labelSlug: track.albumLabelSlug,
    code: track.albumCode || track.cdCode,
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
  const legacyKeyword = searchParams.get("keyword") ?? "";
  const rawInitialQuery = searchParams.get("q") ?? legacyKeyword;
  const initialQuery = stripQuotes(rawInitialQuery);
  const initialBrief = stripQuotes(searchParams.get("brief") ?? "");
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
  const [searchMode, setSearchMode] = useState<SearchMode>(initialBrief ? "intent" : "title");
  const [translateAliases, setTranslateAliases] = useState(searchParams.get("translate") !== "0");
  const [intentResolutionPending, setIntentResolutionPending] = useState(false);
  const [intentUnsupported, setIntentUnsupported] = useState(false);
  const initialResultView: ResultView = searchParams.get("view") === "albums" ? "albums" : "tracks";
  const [view, setView] = useState<ResultView>(initialResultView);
  const [type, setType] = useState<VersionType>(searchParams.get("type") === "all" ? "all" : "main");
  const [density, setDensity] = useState<Density>(searchParams.get("density") === "mid" || searchParams.get("density") === "light" ? searchParams.get("density") as Density : "full");
  const initialSort = searchParams.get("sort");
  const [sort, setSort] = useState<SortMode>(
    initialSort === "recent" || initialSort === "oldest" || initialSort === "title" || initialSort === "title-desc"
      ? initialSort
      : "relevance",
  );
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get("page")) || 1));
  const [categories, setCategories] = useState<string[]>(sorted([
    ...csv(searchParams.get("categories")),
    ...legacyRaw,
  ].map(categoryId).filter((value): value is string => Boolean(value))));
  const [labels, setLabels] = useState<string[]>(sorted(csv(searchParams.get("labels") ?? searchParams.get("label")).filter((value) => !value.startsWith("-"))));
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
  const [saveSearchError, setSaveSearchError] = useState("");
  const [saveSearchRequestId, setSaveSearchRequestId] = useState("");
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

  const updateCategories = useCallback((values: string[]) => {
    setCategories(sorted(values));
    setIntentUnsupported(false);
    setPage(1);
  }, []);
  const updateLabels = useCallback((values: string[]) => { setLabels(sorted(values)); setIntentUnsupported(false); setPage(1); }, []);
  const updateBpm = useCallback((value: [number, number]) => {
    setBpmRange(value);
    setIntentUnsupported(false);
    setPage(1);
  }, []);
  const updateDuration = useCallback((value: [number, number]) => { setDurationRange(value); setIntentUnsupported(false); setPage(1); }, []);

  useEffect(() => {
    // On mobile the filter sheet is an explicit apply surface. Deferring the URL
    // replacement keeps the focus trap and scroll position stable while users
    // make several selections; closing the sheet commits the canonical URL.
    if (mobileFiltersOpen) return;
    const params = new URLSearchParams();
    if (brief) params.set("brief", brief);
    if (query) params.set("q", query);
    if (query && !translateAliases) params.set("translate", "0");
    params.set("view", view);
    params.set("type", type);
    if (page > 1) params.set("page", String(page));
    if (sort !== "relevance") params.set("sort", sort);
    if (density !== "full") params.set("density", density);
    if (labels.length) params.set("labels", sorted(labels).join(","));
    if (categories.length) params.set("categories", sorted(categories).join(","));
    if (bpmRange[0] !== DEFAULT_BPM[0]) params.set("bpmMin", String(bpmRange[0]));
    if (bpmRange[1] !== DEFAULT_BPM[1]) params.set("bpmMax", String(bpmRange[1]));
    if (durationRange[0] !== DEFAULT_DURATION[0]) params.set("durationMin", String(durationRange[0]));
    if (durationRange[1] !== DEFAULT_DURATION[1]) params.set("durationMax", String(durationRange[1]));
    const next = params.toString();
    if (next !== searchParams.toString()) router.replace(`/search${next ? `?${next}` : ""}`, { scroll: false });
  }, [bpmRange, brief, categories, density, durationRange, labels, mobileFiltersOpen, page, query, router, searchParams, sort, translateAliases, type, view]);

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
    setBpmRange(DEFAULT_BPM);
    setDurationRange(DEFAULT_DURATION);
    setType("main");
    setPage(1);
  }, []);

  const requestParams = useMemo(() => ({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    query: query || undefined,
    brief: brief || undefined,
    resolveBrief: Boolean(brief),
    labels,
    categories,
    minBpm: bpmRange[0] !== DEFAULT_BPM[0] ? bpmRange[0] : undefined,
    maxBpm: bpmRange[1] !== DEFAULT_BPM[1] ? bpmRange[1] : undefined,
    minDuration: durationRange[0] !== DEFAULT_DURATION[0] ? durationRange[0] : undefined,
    maxDuration: durationRange[1] !== DEFAULT_DURATION[1] ? durationRange[1] : undefined,
    type,
    language: locale,
    sort,
    translate: translateAliases,
  }), [bpmRange, brief, categories, durationRange, labels, locale, page, query, sort, translateAliases, type]);
  const debouncedParams = useDebounced(requestParams, 300);
  const searchEnabled = !intentResolutionPending;
  const tracksQuery = useTracks(debouncedParams, view === "tracks" && searchEnabled);
  const albumsQuery = useAlbums({ ...debouncedParams, forceSearch: true, sort }, view === "albums" && searchEnabled);
  const activeQuery = view === "tracks" ? tracksQuery : albumsQuery;
  const intentResolution = view === "tracks" ? tracksQuery.data?.intentResolution : albumsQuery.data?.intentResolution;
  const resolvedIntentUnsupported = intentUnsupported || Boolean(brief && intentResolution && !intentResolution.supported);
  const tracks = resolvedIntentUnsupported ? [] : tracksQuery.data?.tracks ?? [];
  const albums = resolvedIntentUnsupported ? [] : albumsQuery.data?.albums ?? [];
  const total = resolvedIntentUnsupported ? 0 : view === "tracks" ? tracksQuery.data?.pagination.total ?? 0 : albumsQuery.data?.pagination.total ?? 0;
  const facets: SearchFacets | undefined = view === "tracks" ? tracksQuery.data?.facets : albumsQuery.data?.facets;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const searchHistoryId = view === "tracks" ? tracksQuery.data?.searchHistoryId : albumsQuery.data?.searchHistoryId;
  const queryResolution = view === "tracks" ? tracksQuery.data?.queryResolution : albumsQuery.data?.queryResolution;

  const draftIntent = useMemo(() => parseSearchIntent(searchMode === "intent" ? queryDraft : ""), [queryDraft, searchMode]);
  const draftIntentChips = useMemo(() => searchIntentChips(draftIntent, locale), [draftIntent, locale]);
  const commitSearchDraft = useCallback((rawValue: string) => {
    const value = rawValue.trim();
    if (!value) {
      setQuery("");
      setBrief("");
      setTranslateAliases(true);
      setIntentUnsupported(false);
      setIntentResolutionPending(false);
      setPage(1);
      return;
    }
    if (value.length < 2) return;
    setPage(1);

    if (searchMode === "title") {
      setBrief("");
      setQuery(value);
      setTranslateAliases(true);
      setIntentUnsupported(false);
      setIntentResolutionPending(false);
      return;
    }

    setBrief(value);
    setQuery("");
    setIntentUnsupported(false);
    setIntentResolutionPending(false);
  }, [searchMode]);

  useEffect(() => {
    const timeout = window.setTimeout(() => commitSearchDraft(queryDraft), 400);
    return () => window.clearTimeout(timeout);
  }, [commitSearchDraft, queryDraft]);

  const applyUnifiedSearch = () => commitSearchDraft(queryDraft);

  const clearUnifiedSearch = () => {
    setQueryDraft("");
    setQuery("");
    setBrief("");
    setTranslateAliases(true);
    setIntentUnsupported(false);
    setIntentResolutionPending(false);
    resetFilters();
  };

  const activeValues = categories;
  const includedCount = activeValues.filter((value) => !value.startsWith("-")).length + labels.length;
  const excludedCount = activeValues.filter((value) => value.startsWith("-")).length;
  const resultStart = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const resultEnd = Math.min(page * PAGE_SIZE, total);
  const removeValue = (value: string, source: "categories" | "labels") => {
    const setter = source === "categories" ? updateCategories : updateLabels;
    setter((source === "categories" ? categories : labels).filter((item) => item !== value));
  };
  const openSaveSearch = () => {
    const fallback = (brief || query).replaceAll('"', "").trim() || (locale === "fr" ? "Ma recherche Parigo" : "My Parigo search");
    setSaveSearchName(fallback.slice(0, 160));
    setSaveSearchState("idle");
    setSaveSearchError("");
    setSaveSearchRequestId("");
    setSaveSearchOpen(true);
  };

  const saveCurrentSearch = async () => {
    if (!searchHistoryId || !saveSearchName.trim()) return;
    setSaveSearchState("saving");
    setSaveSearchError("");
    setSaveSearchRequestId("");
    const searchUrl = `${window.location.pathname}${window.location.search}`;
    const response = await fetch("/api/user/searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: saveSearchName.trim(), searchHistoryId, searchUrl }),
    });
    const payload = await response.json().catch(() => null);
    setSaveSearchState(response.ok ? "saved" : "error");
    if (!response.ok) {
      setSaveSearchError(payload?.error?.message || (locale === "fr"
        ? "La recherche n’a pas pu être sauvegardée."
        : "The search could not be saved."));
      setSaveSearchRequestId(payload?.error?.requestId || response.headers.get("X-Request-ID") || "");
    }
    if (response.ok) window.setTimeout(() => setSaveSearchOpen(false), 900);
  };

  const verifySavedSearch = async () => {
    setSaveSearchState("saving");
    setSaveSearchError("");
    const searchUrl = `${window.location.pathname}${window.location.search}`;
    const response = await fetch("/api/user/searches", { cache: "no-store" });
    const payload = await response.json().catch(() => null);
    const searches = Array.isArray(payload?.data?.searches) ? payload.data.searches : [];
    const verified = response.ok && searches.some((search: { name?: string; searchUrl?: string }) =>
      search.name === saveSearchName.trim() && search.searchUrl === searchUrl,
    );
    setSaveSearchState(verified ? "saved" : "error");
    if (verified) {
      window.setTimeout(() => setSaveSearchOpen(false), 900);
    } else {
      setSaveSearchError(payload?.error?.message || (locale === "fr"
        ? "La recherche n’apparaît pas encore dans votre compte."
        : "The search is not visible in your account yet."));
      setSaveSearchRequestId(payload?.error?.requestId || response.headers.get("X-Request-ID") || saveSearchRequestId);
    }
  };

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
      onCategoriesChange={updateCategories}
      onLabelsChange={updateLabels}
      onBpmChange={updateBpm}
      onDurationChange={updateDuration}
      onReset={resetFilters}
    />
  );

  return (
    <div className="page-shell flex min-h-screen min-w-0 flex-col overflow-x-clip">
      <Header />
      <main className="min-w-0 flex-1 overflow-x-clip pb-28 pt-28 md:pt-32">
        <section className="border-b border-[var(--line)] px-4 pb-7 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1800px]">
            <div className="grid items-end gap-6 lg:grid-cols-[minmax(240px,.45fr)_minmax(0,1fr)]">
              <div>
                <h1 className="text-[clamp(2.8rem,5vw,5.5rem)] leading-[.92] tracking-[-.06em]">{locale === "fr" ? "Trouver la bonne musique." : "Find the right music."}</h1>
              </div>
              <div>
                <div>
                  <form onSubmit={(event) => { event.preventDefault(); applyUnifiedSearch(); }} className="ai-search-shell search-query-frame flex min-h-16 items-center border border-[var(--line-strong)] bg-[var(--surface)] p-1.5 transition">
                    {searchMode === "intent" ? <Sparkles size={20} className="ml-3 shrink-0 text-[var(--signal-strong)]" /> : <Search size={20} className="ml-3 shrink-0 text-[var(--signal-strong)]" />}
                    <label htmlFor="catalog-search" className="sr-only">{searchMode === "intent" ? (locale === "fr" ? "Décrivez votre intention musicale" : "Describe your music brief") : view === "tracks" ? (locale === "fr" ? "Rechercher dans les titres de pistes" : "Search track titles") : (locale === "fr" ? "Rechercher dans les titres ou références d’albums" : "Search album titles or references")}</label>
                    <input id="catalog-search" role="searchbox" value={queryDraft} onChange={(event) => {
                      setTranslateAliases(true);
                      setQueryDraft(event.target.value);
                    }} maxLength={500} autoComplete="off" placeholder={searchMode === "intent" ? (locale === "fr" ? "Une techno énergique pour un mariage entre 120 et 140 BPM…" : "Energetic techno for a wedding between 120 and 140 BPM…") : view === "tracks" ? (locale === "fr" ? "Un mot présent dans le titre d’une piste…" : "A word contained in a track title…") : (locale === "fr" ? "Titre ou référence d’un album…" : "Album title or reference…")} className="ai-search-input min-w-0 flex-1 bg-transparent px-3 py-3 text-base outline-none" />
                    {queryDraft && <button type="button" onClick={clearUnifiedSearch} className="flex h-10 w-10 items-center justify-center hover:bg-[var(--surface-soft)]" aria-label={locale === "fr" ? "Effacer la recherche" : "Clear search"}><X size={16} /></button>}
                    <Button type="submit" size="sm" disabled={!queryDraft.trim() || intentResolutionPending} aria-label={searchMode === "intent" ? (locale === "fr" ? "Analyser et rechercher" : "Analyse and search") : t("common.search")}><span className="hidden sm:inline">{intentResolutionPending ? (locale === "fr" ? "Analyse…" : "Analysing…") : t("common.search")}</span>{intentResolutionPending ? <ParigoLoader size="icon" label={locale === "fr" ? "Analyse en cours" : "Analysing"} className="sm:hidden" /> : <ChevronRight className="sm:hidden" size={17} />}</Button>
                  </form>
                </div>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  {searchMode === "intent" && draftIntentChips.length > 0 ? (
                    <div data-testid="search-detected-criteria" className="flex flex-1 flex-wrap items-center gap-2 text-[var(--text-muted)]" aria-live="polite">
                      <span className="eyebrow">{locale === "fr" ? "Critères détectés" : "Detected criteria"}</span>
                      {draftIntentChips.map((chip) => <span key={chip.key} className="search-chip search-chip--included px-2.5 py-1 text-xs text-[var(--foreground)]">{chip.label}</span>)}
                    </div>
                  ) : <span className="flex-1" aria-live="polite" />}
                  <div className="search-view-toggle inline-flex min-h-11 shrink-0 border border-[var(--line-strong)] bg-[var(--background)] p-1" role="group" aria-label={locale === "fr" ? "Mode de recherche" : "Search mode"}>
                    <button type="button" aria-pressed={searchMode === "title"} onClick={() => { setSearchMode("title"); setPage(1); }} className={cn("inline-flex min-h-9 items-center gap-2 px-3 text-xs font-semibold transition", searchMode === "title" && "bg-[var(--foreground)] text-[var(--background)]")}><Search size={13} />{locale === "fr" ? "Par titre" : "By title"}</button>
                    <button type="button" aria-pressed={searchMode === "intent"} onClick={() => { setSearchMode("intent"); setPage(1); }} className={cn("inline-flex min-h-9 items-center gap-2 px-3 text-xs font-semibold transition", searchMode === "intent" && "bg-[var(--foreground)] text-[var(--background)]")}><Sparkles size={13} />{locale === "fr" ? "Par intention" : "By brief"}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-[1800px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:px-8">
          <aside className="sticky top-24 hidden h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain pb-5 lg:block" aria-label={locale === "fr" ? "Filtres de recherche" : "Search filters"}>
            {filtersQuery.isLoading ? <div className="flex min-h-52 items-center justify-center rounded-xl border border-[var(--line)]"><ParigoLoader label={t("common.loading")} /></div> : filterPanel}
          </aside>

          <section className="min-w-0" aria-live="polite">
            <div className="search-toolbar mb-4 flex flex-wrap items-stretch justify-between gap-3 border border-[var(--line-strong)] bg-[var(--surface)] p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <button ref={mobileTriggerRef} type="button" onClick={() => setMobileFiltersOpen(true)} className="inline-flex min-h-11 items-center gap-2 border border-[var(--line-strong)] px-3 text-xs font-semibold lg:hidden"><SlidersHorizontal size={15} />{locale === "fr" ? "Filtres" : "Filters"}{includedCount + excludedCount > 0 && <span className="bg-[var(--signal-strong)] px-1.5 font-mono text-white">{includedCount + excludedCount}</span>}</button>
                <div className="search-view-toggle inline-flex min-h-11 border border-[var(--line-strong)] bg-[var(--background)] p-1" role="group" aria-label={locale === "fr" ? "Type de résultats" : "Result type"}>
                  <button type="button" aria-pressed={view === "tracks"} onClick={() => { setView("tracks"); setPage(1); }} className={cn("inline-flex min-h-10 items-center gap-2 px-3 text-xs font-semibold transition", view === "tracks" && "bg-[var(--foreground)] text-[var(--background)]")}><Disc3 size={14} />{locale === "fr" ? "Pistes" : "Tracks"}</button>
                  <button type="button" aria-pressed={view === "albums"} onClick={() => { setView("albums"); setPage(1); }} className={cn("inline-flex min-h-10 items-center gap-2 px-3 text-xs font-semibold transition", view === "albums" && "bg-[var(--foreground)] text-[var(--background)]")}><LayoutGrid size={14} />Albums</button>
                </div>
                {view === "tracks" ? <Select variant="editorial" caption={locale === "fr" ? "Versions" : "Versions"} value={type} onValueChange={(value) => { setType(value); setPage(1); }} ariaLabel={locale === "fr" ? "Versions des pistes" : "Track versions"} className="min-w-[11.5rem]" options={[{ value: "main", label: locale === "fr" ? "Versions principales" : "Main versions" }, { value: "all", label: locale === "fr" ? "Toutes les versions" : "All versions" }]} /> : null}
              </div>
              <div className="flex w-full flex-wrap items-stretch justify-end gap-2 sm:w-auto">
                {view === "tracks" ? <Select variant="editorial" caption={locale === "fr" ? "Affichage" : "Display"} value={density} onValueChange={setDensity} ariaLabel={locale === "fr" ? "Niveau de détail des pistes" : "Track detail level"} className="min-w-[10.5rem]" options={[{ value: "full", label: locale === "fr" ? "Piste détaillée" : "Detailed track" }, { value: "mid", label: locale === "fr" ? "Piste compacte" : "Compact track" }, { value: "light", label: locale === "fr" ? "Piste essentielle" : "Essential track" }]} /> : null}
                <Select variant="editorial" caption={locale === "fr" ? "Ordre" : "Order"} value={sort} onValueChange={(value) => { setSort(value); setPage(1); }} ariaLabel={locale === "fr" ? "Trier les résultats" : "Sort results"} className="min-w-0 sm:min-w-[9rem]" options={[
                  { value: "relevance", label: locale === "fr" ? "Pertinence" : "Relevance" },
                  { value: "recent", label: locale === "fr" ? "Plus récents" : "Newest" },
                  { value: "oldest", label: locale === "fr" ? "Plus anciens" : "Oldest" },
                  { value: "title", label: "A–Z" },
                  { value: "title-desc", label: "Z–A" },
                ]} />
              </div>
            </div>

            {(categories.length > 0 || labels.length > 0 || bpmRange[0] !== 50 || bpmRange[1] !== 200 || durationRange[0] !== 0 || durationRange[1] !== 300) && (
              <div className="search-active-filters mb-4 border border-[var(--line-strong)] bg-[var(--background)] p-3">
                <div className="mb-3 flex items-center justify-between gap-4"><p className="font-mono text-[.62rem] font-semibold uppercase tracking-[.1em]">{locale === "fr" ? `${includedCount} inclus · ${excludedCount} exclus` : `${includedCount} included · ${excludedCount} excluded`}</p><button type="button" onClick={resetFilters} className="inline-flex min-h-9 items-center gap-2 border border-[var(--line)] bg-[var(--surface)] px-3 text-[.68rem] font-semibold transition hover:border-[var(--signal-strong)] hover:text-[var(--signal-strong)]"><RotateCcw size={12} />{locale === "fr" ? "Tout effacer" : "Clear all"}</button></div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((value) => { const id = value.replace(/^-/, ""); const negative = value.startsWith("-"); return <button key={value} type="button" onClick={() => removeValue(value, "categories")} className={cn("search-chip inline-flex min-h-9 items-center gap-1.5 px-3 text-xs", negative ? "search-chip--excluded filter-chip-excluded" : "search-chip--included")}><span className={cn("search-chip__mark flex h-4 w-4 items-center justify-center", negative ? "bg-[var(--danger)] text-white" : "bg-[var(--signal-strong)] text-white")}>{negative ? <Minus size={10} /> : <Check size={10} />}</span>{itemNames.get(id) ?? id}<X size={12} /></button>; })}
                  {labels.map((value) => <button key={value} type="button" onClick={() => removeValue(value, "labels")} className="search-chip search-chip--included inline-flex min-h-9 items-center gap-1.5 px-3 text-xs"><span className="search-chip__mark flex h-4 w-4 items-center justify-center bg-[var(--signal-strong)] text-white"><Check size={10} /></span>{itemNames.get(value) ?? value}<X size={12} /></button>)}
                  {(bpmRange[0] !== 50 || bpmRange[1] !== 200) && <button type="button" onClick={() => updateBpm(DEFAULT_BPM)} className="search-chip inline-flex min-h-9 items-center gap-1.5 px-3 font-mono text-xs">BPM {bpmRange[0]}–{bpmRange[1]}<X size={12} /></button>}
                  {(durationRange[0] !== 0 || durationRange[1] !== 300) && <button type="button" onClick={() => updateDuration(DEFAULT_DURATION)} className="search-chip inline-flex min-h-9 items-center gap-1.5 px-3 font-mono text-xs">{formatDuration(durationRange[0])}–{formatDuration(durationRange[1])}<X size={12} /></button>}
                </div>
              </div>
            )}

            {queryResolution && translateAliases ? (
              <div className="mb-4 flex flex-col gap-3 border border-[var(--signal-strong)] bg-[var(--surface)] p-3 text-sm sm:flex-row sm:items-center sm:justify-between" role="status">
                <span>{locale === "fr" ? "Aucun titre littéral trouvé. Recherche interprétée comme" : "No literal title found. Search interpreted as"} <strong>« {queryResolution.effective} »</strong>.</span>
                <button type="button" onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("translate", "0");
                  params.delete("page");
                  setTranslateAliases(false);
                  setPage(1);
                  router.replace(`/search?${params.toString()}`, { scroll: false });
                }} className="min-h-9 self-start border-b border-[var(--line-strong)] text-xs font-semibold hover:border-[var(--signal-strong)] hover:text-[var(--signal-strong)]">
                  {locale === "fr" ? `Chercher « ${queryResolution.original} » littéralement` : `Search literally for “${queryResolution.original}”`}
                </button>
              </div>
            ) : null}

            <div className="mb-4 flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3 text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-3"><span>{intentResolutionPending || activeQuery.isFetching ? (locale === "fr" ? "Recherche…" : "Searching…") : `${resultStart}–${resultEnd} / ${total.toLocaleString(locale)}`}</span>{session?.user && <button type="button" onClick={openSaveSearch} disabled={!searchHistoryId || intentResolutionPending || activeQuery.isFetching} className="inline-flex min-h-9 items-center gap-2 border-l border-[var(--line)] pl-3 font-semibold text-[var(--foreground)] transition hover:text-[var(--signal-strong)] disabled:cursor-not-allowed disabled:opacity-35"><BookmarkPlus size={14} />{locale === "fr" ? "Sauvegarder" : "Save"}</button>}</div>
              {(brief || query) && <span>{brief ? (locale === "fr" ? "Brief interprété" : "Interpreted brief") : (locale === "fr" ? "Résultats pour" : "Results for")} « {brief || query} »</span>}
            </div>

            {saveSearchOpen && <div className="mb-4 grid gap-3 border border-[var(--line-strong)] bg-[var(--surface)] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><label className="text-xs font-semibold"><span className="mb-2 block">{locale === "fr" ? "Nom de la recherche" : "Search name"}</span><input autoFocus value={saveSearchName} onChange={(event) => { setSaveSearchName(event.target.value); setSaveSearchState("idle"); setSaveSearchError(""); setSaveSearchRequestId(""); }} maxLength={160} className="min-h-11 w-full border border-[var(--line)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--foreground)]" /></label><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => setSaveSearchOpen(false)}>{locale === "fr" ? "Annuler" : "Cancel"}</Button><Button size="sm" disabled={!saveSearchName.trim() || !searchHistoryId || saveSearchState === "saving"} onClick={() => void saveCurrentSearch()}>{saveSearchState === "saving" ? <ParigoLoader size="icon" label={locale === "fr" ? "Enregistrement" : "Saving"} /> : <BookmarkPlus size={14} />}{saveSearchState === "saved" ? (locale === "fr" ? "Sauvegardée" : "Saved") : (locale === "fr" ? "Enregistrer" : "Save")}</Button></div>{saveSearchState === "error" && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--danger)] sm:col-span-2"><div><p>{saveSearchError}</p>{saveSearchRequestId && <p className="mt-1 font-mono text-[.62rem] opacity-65">Référence : {saveSearchRequestId}</p>}</div><Button variant="outline" size="sm" onClick={() => void verifySavedSearch()}>{locale === "fr" ? "Réessayer la vérification" : "Check again"}</Button></div>}</div>}

            {resolvedIntentUnsupported ? (
              <div className="border border-[var(--line)] px-5 py-24 text-center"><h2 className="text-3xl">{locale === "fr" ? "Cette intention n’est pas encore comprise." : "This brief is not understood yet."}</h2><p className="mx-auto mt-4 max-w-xl text-sm text-[var(--text-muted)]">{locale === "fr" ? "Ajoutez un genre, une humeur, un instrument, un usage ou une plage de BPM, ou passez en mode « Par titre »." : "Add a genre, mood, instrument, use or BPM range, or switch to “By title”."}</p><Button variant="outline" onClick={() => setSearchMode("title")} className="mt-6">{locale === "fr" ? "Rechercher par titre" : "Search by title"}</Button></div>
            ) : intentResolutionPending || activeQuery.isLoading || activeQuery.isFetching && !activeQuery.data ? (
              <div className="flex min-h-96 items-center justify-center"><ParigoLoader size="page" label={t("common.loading")} /></div>
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
                <div data-testid="search-album-grid" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{albums.map((album, index) => <article key={album.id} style={{ animationDelay: `${index * 18}ms` }} className="parigo-card animate-[fade-in_.25s_ease-out_both] border border-[var(--line)] bg-[var(--surface)] p-2.5"><Link href={localizedPath(`/albums/${album.slug || album.id}`)} className="group block"><div className="media-frame relative aspect-square overflow-hidden bg-[var(--surface-soft)]"><Image src={album.cover} alt={album.title} fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 20vw" className="object-contain transition duration-700 group-hover:scale-[1.025]" /></div><div className="py-3"><h2 className="truncate text-base tracking-[-.025em]">{album.title}</h2><div className="mt-2 flex min-w-0 flex-wrap items-center gap-2"><p className="min-w-0 truncate text-[.68rem] text-[var(--text-muted)]">{album.label}</p>{album.code && <span className="album-reference-tag shrink-0">{locale === "fr" ? "Réf." : "Ref."} {album.code}</span>}</div></div></Link></article>)}</div>
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
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><ParigoLoader size="page" /></div>}><SearchContent /></Suspense>;
}
