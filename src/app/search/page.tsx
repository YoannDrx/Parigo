"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
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
import { Header, Footer } from "@/components/layout";
import { TrackRow } from "@/components/features";
import { SearchFilterPanel } from "@/components/search/SearchFilterPanel";
import { Button, Select } from "@/components/ui";
import { useAlbums, useSearchFilters, useTracks } from "@/hooks/use-api";
import { useI18n } from "@/components/providers/I18nProvider";
import { canonicalizeCategoryValues, findSearchFilterId, parseSearchIntent, resolveIntentCategoryIds } from "@/lib/search-intent";
import { cn, formatDuration } from "@/lib/utils";
import type { Album, SearchFacets, SearchFilterGroupKey, SearchFilterItem, Track } from "@/types";
import { useSession } from "@/lib/auth-client";

type ResultView = "tracks" | "albums";
type Density = "full" | "mid" | "light";
type SortMode = "relevance" | "recent" | "oldest" | "title" | "title-desc" | "bpm-asc" | "bpm-desc" | "duration-asc" | "duration-desc";
type VersionType = "main" | "all";

const PAGE_SIZE = 30;
const DEFAULT_BPM: [number, number] = [50, 200];
const DEFAULT_DURATION: [number, number] = [0, 300];
const PRODUCTION_SUGGESTIONS = [
  "upbeat", "dramatic", "drama", "positive", "driving", "building", "bright", "fun", "energetic", "dark",
  "happy", "mysterious", "confident", "action", "uplifting", "warm", "uptempo", "tension", "fast", "determined",
  "electronic", "piano", "documentary", "tense", "suspense", "cinematic", "synths", "guitar", "dreamy", "atmospheric",
  "powerful", "strings", "reflective", "synth", "orchestral", "cool", "light", "bouncy", "intense", "quirky",
  "retro", "medium", "edgy", "playful", "dance", "epic", "exciting", "optimistic", "emotional", "aggressive",
  "vocals", "pop", "percussion", "ambient", "mid", "drums", "tempo", "mid-tempo", "hopeful", "party",
  "lively", "romantic", "vocal", "sports", "rock", "sexy", "ominous", "flowing", "adventure", "pulsing",
  "bass", "electronica", "percussive", "gentle", "smooth", "relaxed", "serious", "sound design", "test", "carefree",
  "dynamic", "trailer", "world", "love", "factual", "suspenseful", "gritty", "slow", "mystery", "travel",
  "comedy", "heartfelt", "cheerful", "funky", "film", "underscore", "eerie", "heavy", "anticipation", "tender",
] as const;

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
  const { locale, t } = useI18n();
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = stripQuotes(searchParams.get("q") ?? searchParams.get("keyword") ?? "");
  const legacyEntries = useMemo(() => ([
    ["category", null],
    ["genre", "genre"],
    ["mood", "moods"],
    ["instrument", "instruments"],
  ] as const).flatMap(([param, group]) => searchParams.getAll(param).flatMap(csv).map((value) => ({ value, group }))), [searchParams]);
  const legacyRaw = useMemo(() => legacyEntries.map(({ value }) => value), [legacyEntries]);

  const [query, setQuery] = useState(initialQuery);
  const [queryDraft, setQueryDraft] = useState(initialQuery);
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
  const [assistedOpen, setAssistedOpen] = useState(false);
  const [assistedDraft, setAssistedDraft] = useState("");
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
  }, [bpmRange, categories, density, durationRange, labels, mobileFiltersOpen, page, query, router, searchParams, sort, styles, type, view]);

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
  const tracksQuery = useTracks(debouncedParams, view === "tracks");
  const albumsQuery = useAlbums({ ...debouncedParams, forceSearch: true, sort }, view === "albums");
  const activeQuery = view === "tracks" ? tracksQuery : albumsQuery;
  const tracks = tracksQuery.data?.tracks ?? [];
  const albums = albumsQuery.data?.albums ?? [];
  const total = view === "tracks" ? tracksQuery.data?.pagination.total ?? 0 : albumsQuery.data?.pagination.total ?? 0;
  const facets: SearchFacets | undefined = view === "tracks" ? tracksQuery.data?.facets : albumsQuery.data?.facets;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const searchHistoryId = view === "tracks" ? tracksQuery.data?.searchHistoryId : albumsQuery.data?.searchHistoryId;

  const assisted = useMemo(() => parseSearchIntent(assistedDraft), [assistedDraft]);
  const detectedNames = [...new Set([...assisted.genres, ...assisted.moods, ...assisted.instruments])];
  const applyAssisted = () => {
    const detectedIds = resolveIntentCategoryIds(assisted, filterGroups);
    const hasStructuredCriteria = Boolean(detectedIds.length || assisted.bpmRange);
    const nextQuery = hasStructuredCriteria ? "" : assisted.freeText || assistedDraft.trim();
    setQuery(nextQuery);
    setQueryDraft(nextQuery);
    setCategories(sorted(detectedIds));
    if (detectedNames.length) {
      const detected = new Set(detectedNames.map((name) => name.toLocaleLowerCase(locale)));
      setStyles((current) => sorted(current.filter((value) => {
        const id = value.replace(/^-/, "");
        return !detected.has((itemNames.get(id) ?? "").toLocaleLowerCase(locale));
      })));
    }
    if (assisted.bpmRange) setBpmRange([Math.max(50, assisted.bpmRange[0]), Math.min(200, assisted.bpmRange[1])]);
    setPage(1);
    setAssistedOpen(false);
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
    setQuery(nextQuery);
    setQueryDraft(nextQuery);
    setPage(1);
  };

  const openSaveSearch = () => {
    const fallback = query.replaceAll('"', "").trim() || (locale === "fr" ? "Ma recherche Parigo" : "My Parigo search");
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
                <form onSubmit={(event) => { event.preventDefault(); setQuery(queryDraft.trim()); setPage(1); }} className="flex min-h-15 items-center rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-sm)]">
                  <Search size={20} className="ml-3 shrink-0 text-[var(--signal-strong)]" />
                  <label htmlFor="catalog-search" className="sr-only">{t("common.search")}</label>
                  <input id="catalog-search" value={queryDraft} onChange={(event) => setQueryDraft(event.target.value)} placeholder={locale === "fr" ? "Titre, mot-clé, compositeur, instrument…" : "Title, keyword, composer, instrument…"} className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base outline-none" />
                  {queryDraft && <button type="button" onClick={() => { setQueryDraft(""); setQuery(""); setPage(1); }} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--surface-soft)]" aria-label={locale === "fr" ? "Effacer la recherche" : "Clear search"}><X size={16} /></button>}
                  <Button type="submit" size="sm" aria-label={t("common.search")}><span className="hidden sm:inline">{t("common.search")}</span><ChevronRight className="sm:hidden" size={17} /></Button>
                </form>
                <button type="button" onClick={() => setAssistedOpen((value) => !value)} aria-expanded={assistedOpen} className="mt-2 inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--signal-strong)]"><Sparkles size={14} />{locale === "fr" ? "Recherche assistée" : "Assisted search"}</button>
                {assistedOpen && (
                  <div className="mt-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
                    <label className="text-xs font-semibold" htmlFor="assisted-search">{locale === "fr" ? "Décrivez votre intention musicale" : "Describe your music brief"}</label>
                    <textarea id="assisted-search" value={assistedDraft} onChange={(event) => setAssistedDraft(event.target.value)} rows={2} placeholder={locale === "fr" ? "Un piano intime, sans voix, pour un documentaire…" : "An intimate instrumental piano track for a documentary…"} className="mt-2 w-full resize-none rounded-md border border-[var(--line)] bg-transparent p-3 text-sm outline-none focus:border-[var(--signal-strong)]" />
                    {assistedDraft && <div className="mt-3"><p className="text-[.68rem] font-semibold uppercase tracking-[.1em] text-[var(--text-muted)]">{locale === "fr" ? "Critères détectés — à vérifier" : "Detected criteria — review before search"}</p><div className="mt-2 flex flex-wrap gap-2">{detectedNames.map((name) => <span key={name} className="rounded-full border border-[var(--line)] px-3 py-1 text-xs">{name}</span>)}{assisted.bpmRange && <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs">{assisted.bpmRange.join("–")} BPM</span>}{!detectedNames.length && !assisted.bpmRange && <span className="text-xs text-[var(--text-muted)]">{locale === "fr" ? "Aucun filtre structuré détecté : la phrase restera un mot-clé." : "No structured filter detected: the sentence will remain a keyword."}</span>}</div>{(detectedNames.length > 0 || assisted.bpmRange) && <p className="mt-3 max-w-xl text-xs leading-5 text-[var(--text-muted)]">{locale === "fr" ? "Ces critères remplacent la phrase libre pour éviter de contraindre deux fois la même intention." : "These criteria replace the free-form sentence so the same intent is not constrained twice."}</p>}<Button type="button" size="sm" onClick={applyAssisted} disabled={detectedNames.length > 0 && filtersQuery.isLoading} className="mt-3">{filtersQuery.isLoading && detectedNames.length > 0 ? (locale === "fr" ? "Préparation des critères…" : "Preparing criteria…") : (locale === "fr" ? "Appliquer ces critères" : "Apply criteria")}</Button></div>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-[1800px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:px-8">
          <aside className="sticky top-24 hidden h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain pb-5 lg:block" aria-label={locale === "fr" ? "Filtres de recherche" : "Search filters"}>
            {filtersQuery.isLoading ? <div className="flex min-h-52 items-center justify-center rounded-xl border border-[var(--line)]"><Loader2 className="animate-spin" /></div> : filterPanel}
          </aside>

          <section className="min-w-0" aria-live="polite">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <button ref={mobileTriggerRef} type="button" onClick={() => setMobileFiltersOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--line)] px-3 text-xs font-semibold lg:hidden"><SlidersHorizontal size={15} />{locale === "fr" ? "Filtres" : "Filters"}{includedCount + excludedCount > 0 && <span className="rounded-full bg-[var(--signal-strong)] px-1.5 text-white">{includedCount + excludedCount}</span>}</button>
                <div className="inline-flex rounded-md border border-[var(--line)] p-1" role="group" aria-label={locale === "fr" ? "Type de résultats" : "Result type"}>
                  <button type="button" aria-pressed={view === "tracks"} onClick={() => { setView("tracks"); setPage(1); }} className={cn("min-h-9 rounded px-3 text-xs font-semibold", view === "tracks" && "bg-[var(--foreground)] text-[var(--background)]")}><Disc3 size={14} className="mr-1.5 inline" />{locale === "fr" ? "Pistes" : "Tracks"}</button>
                  <button type="button" aria-pressed={view === "albums"} onClick={() => { setView("albums"); setPage(1); }} className={cn("min-h-9 rounded px-3 text-xs font-semibold", view === "albums" && "bg-[var(--foreground)] text-[var(--background)]")}><LayoutGrid size={14} className="mr-1.5 inline" />Albums</button>
                </div>
                <Select value={type} onValueChange={(value) => { setType(value); setPage(1); }} ariaLabel={locale === "fr" ? "Versions des pistes" : "Track versions"} className="min-w-[11.5rem]" options={[{ value: "main", label: locale === "fr" ? "Versions principales" : "Main versions" }, { value: "all", label: locale === "fr" ? "Toutes les versions" : "All versions" }]} />
              </div>
              <div className="flex items-center gap-2">
                <Select value={density} onValueChange={setDensity} ariaLabel={locale === "fr" ? "Densité des pistes" : "Track density"} className="min-w-[9.5rem]" options={[{ value: "full", label: locale === "fr" ? "Piste complète" : "Full track" }, { value: "mid", label: locale === "fr" ? "Mi-piste" : "Medium track" }, { value: "light", label: locale === "fr" ? "Piste légère" : "Light track" }]} />
                <Select value={sort} onValueChange={(value) => { setSort(value); setPage(1); }} ariaLabel={locale === "fr" ? "Trier les résultats" : "Sort results"} className="min-w-[9rem]" options={[
                  { value: "relevance", label: locale === "fr" ? "Pertinence" : "Relevance" },
                  { value: "recent", label: locale === "fr" ? "Plus récents" : "Newest" },
                  { value: "oldest", label: locale === "fr" ? "Plus anciens" : "Oldest" },
                  { value: "title", label: "A–Z" }, { value: "title-desc", label: "Z–A" },
                  ...(view === "tracks" ? [{ value: "bpm-asc" as const, label: "BPM ↑" }, { value: "bpm-desc" as const, label: "BPM ↓" }, { value: "duration-asc" as const, label: locale === "fr" ? "Durée ↑" : "Duration ↑" }, { value: "duration-desc" as const, label: locale === "fr" ? "Durée ↓" : "Duration ↓" }] : []),
                ]} />
              </div>
            </div>

            {(categories.length > 0 || labels.length > 0 || styles.length > 0 || bpmRange[0] !== 50 || bpmRange[1] !== 200 || durationRange[0] !== 0 || durationRange[1] !== 300) && (
              <div className="mb-4 rounded-xl border border-[var(--line)] bg-[var(--background)] p-3">
                <div className="mb-3 flex items-center justify-between gap-4"><p className="text-xs font-semibold">{locale === "fr" ? `${includedCount} inclus, ${excludedCount} exclus` : `${includedCount} included, ${excludedCount} excluded`}</p><button type="button" onClick={resetFilters} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 text-[.68rem] font-semibold transition hover:border-[var(--signal-strong)] hover:text-[var(--signal-strong)]"><RotateCcw size={12} />{locale === "fr" ? "Tout effacer" : "Clear all"}</button></div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((value) => { const id = value.replace(/^-/, ""); const negative = value.startsWith("-"); return <button key={value} type="button" onClick={() => removeValue(value, "categories")} className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs transition hover:border-[var(--foreground)]", negative ? "filter-chip-excluded" : "border-[var(--signal-strong)]/35 bg-[var(--signal-soft)] text-[var(--foreground)]")}><span className={cn("flex h-4 w-4 items-center justify-center rounded-full", negative ? "bg-[var(--danger)] text-white" : "bg-[var(--signal-strong)] text-white")}>{negative ? <Minus size={10} /> : <Check size={10} />}</span>{itemNames.get(id) ?? id}<X size={12} /></button>; })}
                  {labels.map((value) => <button key={value} type="button" onClick={() => removeValue(value, "labels")} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--signal-strong)]/35 bg-[var(--signal-soft)] px-3 text-xs text-[var(--foreground)] transition hover:border-[var(--foreground)]"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--signal-strong)] text-white"><Check size={10} /></span>{itemNames.get(value) ?? value}<X size={12} /></button>)}
                  {styles.map((value) => { const id = value.replace(/^-/, ""); const negative = value.startsWith("-"); return <button key={value} type="button" onClick={() => removeValue(value, "styles")} className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs transition hover:border-[var(--foreground)]", negative ? "filter-chip-excluded" : "border-[var(--signal-strong)]/35 bg-[var(--signal-soft)] text-[var(--foreground)]")} ><span className={cn("flex h-4 w-4 items-center justify-center rounded-full", negative ? "bg-[var(--danger)] text-white" : "bg-[var(--signal-strong)] text-white")}>{negative ? <Minus size={10} /> : <Check size={10} />}</span>{itemNames.get(id) ?? id}<X size={12} /></button>; })}
                  {(bpmRange[0] !== 50 || bpmRange[1] !== 200) && <button type="button" onClick={() => updateBpm(DEFAULT_BPM)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--line)] px-3 text-xs">BPM {bpmRange[0]}–{bpmRange[1]}<X size={12} /></button>}
                  {(durationRange[0] !== 0 || durationRange[1] !== 300) && <button type="button" onClick={() => updateDuration(DEFAULT_DURATION)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--line)] px-3 text-xs">{formatDuration(durationRange[0])}–{formatDuration(durationRange[1])}<X size={12} /></button>}
                </div>
              </div>
            )}

            <div className="mb-4 flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3 text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-3"><span>{activeQuery.isFetching ? (locale === "fr" ? "Recherche…" : "Searching…") : `${resultStart}–${resultEnd} / ${total.toLocaleString(locale)}`}</span>{session?.user && <button type="button" onClick={openSaveSearch} disabled={!searchHistoryId || activeQuery.isFetching} className="inline-flex min-h-9 items-center gap-2 border-l border-[var(--line)] pl-3 font-semibold text-[var(--foreground)] transition hover:text-[var(--signal-strong)] disabled:cursor-not-allowed disabled:opacity-35"><BookmarkPlus size={14} />{locale === "fr" ? "Sauvegarder" : "Save"}</button>}</div>
              {query && <span>{locale === "fr" ? "Résultats pour" : "Results for"} « {query} »</span>}
            </div>

            {saveSearchOpen && <div className="mb-4 grid gap-3 border border-[var(--line-strong)] bg-[var(--surface)] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><label className="text-xs font-semibold"><span className="mb-2 block">{locale === "fr" ? "Nom de la recherche" : "Search name"}</span><input autoFocus value={saveSearchName} onChange={(event) => { setSaveSearchName(event.target.value); setSaveSearchState("idle"); }} maxLength={160} className="min-h-11 w-full border border-[var(--line)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--foreground)]" /></label><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => setSaveSearchOpen(false)}>{locale === "fr" ? "Annuler" : "Cancel"}</Button><Button size="sm" disabled={!saveSearchName.trim() || !searchHistoryId || saveSearchState === "saving"} onClick={() => void saveCurrentSearch()}>{saveSearchState === "saving" ? <Loader2 className="animate-spin" size={14} /> : <BookmarkPlus size={14} />}{saveSearchState === "saved" ? (locale === "fr" ? "Sauvegardée" : "Saved") : (locale === "fr" ? "Enregistrer" : "Save")}</Button></div>{saveSearchState === "error" && <p className="text-xs text-[var(--danger)] sm:col-span-2">{locale === "fr" ? "La recherche n’a pas pu être sauvegardée." : "The search could not be saved."}</p>}</div>}

            {!activeQuery.isError && (
              <section className="mb-5 overflow-hidden border-y border-[var(--line)] bg-[var(--surface)] py-3" aria-labelledby="suggested-searches-title">
                <div className="flex items-end justify-between gap-4 px-3 sm:px-4"><div className="flex flex-wrap items-baseline gap-x-3"><p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Pistes de recherche" : "Search directions"}</p><h2 id="suggested-searches-title" className="text-sm font-semibold">{locale === "fr" ? "Recherches suggérées" : "Suggested searches"}</h2></div><span className="shrink-0 font-mono text-[.58rem] text-[var(--text-muted)]">{PRODUCTION_SUGGESTIONS.length} TAGS →</span></div>
                <div className="suggestion-rail mt-2 grid grid-flow-col grid-rows-4 auto-cols-max gap-1.5 overflow-x-auto px-3 pb-2 pt-1.5 sm:grid-rows-3 sm:px-4" aria-label={locale === "fr" ? "Faire défiler les recherches suggérées horizontalement" : "Scroll suggested searches horizontally"}>{PRODUCTION_SUGGESTIONS.map((suggestion) => <button key={suggestion} type="button" onClick={() => addSuggestion(suggestion)} className="min-h-7 rounded-full border border-[var(--line)] bg-[var(--background)] px-2.5 py-1 text-[.68rem] leading-none transition hover:-translate-y-0.5 hover:border-[var(--signal-strong)] hover:bg-[var(--signal-soft)]">{suggestion}</button>)}</div>
              </section>
            )}

            {activeQuery.isLoading || activeQuery.isFetching && !activeQuery.data ? (
              <div className="flex min-h-96 items-center justify-center"><Loader2 className="animate-spin text-[var(--signal-strong)]" size={32} /><span className="sr-only">{t("common.loading")}</span></div>
            ) : activeQuery.isError ? (
              <div className="rounded-xl border border-[var(--line)] px-5 py-24 text-center"><h2 className="text-3xl">{locale === "fr" ? "La recherche est temporairement indisponible." : "Search is temporarily unavailable."}</h2><p className="mt-3 text-sm text-[var(--text-muted)]">{locale === "fr" ? "Réessayez dans quelques instants." : "Please try again in a moment."}</p><Button variant="outline" onClick={() => activeQuery.refetch()} className="mt-7">{t("common.retry")}</Button></div>
            ) : view === "tracks" ? tracks.length ? (
              <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">{tracks.map((track, index) => <TrackRow key={track.id} track={track} album={albumFromTrack(track)} queue={tracks} index={(page - 1) * PAGE_SIZE + index} showAlbumCover compact={density !== "full"} density={density} />)}</div>
            ) : (
              <div className="rounded-xl border border-[var(--line)] px-5 py-24 text-center"><h2 className="text-4xl">{t("search.emptyTitle")}</h2><p className="mx-auto mt-4 max-w-xl text-sm text-[var(--text-muted)]">{t("search.emptyCopy")}</p><Button variant="outline" onClick={resetFilters} className="mt-6">{t("common.reset")}</Button></div>
            ) : albums.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{albums.map((album, index) => <motion.article key={album.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .018 }} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2.5"><Link href={`/albums/${album.slug || album.id}`} className="group block"><div className="relative aspect-square overflow-hidden rounded-lg bg-[var(--surface-soft)]"><Image src={album.cover} alt={album.title} fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 20vw" className="object-contain transition duration-700 group-hover:scale-[1.025]" /></div><div className="flex items-start justify-between gap-3 py-3"><div className="min-w-0"><h2 className="truncate text-base tracking-[-.025em]">{album.title}</h2><p className="mt-1 truncate text-[.68rem] text-[var(--text-muted)]">{album.label}</p></div><span className="font-mono text-[.55rem] opacity-40">{String(index + 1).padStart(2, "0")}</span></div></Link></motion.article>)}</div>
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
          <motion.div ref={dialogRef} initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ duration: .3, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 flex flex-col bg-[var(--background)] sm:inset-x-4 sm:bottom-4 sm:top-10 sm:rounded-2xl">
            <div className="flex min-h-16 items-center justify-between border-b border-[var(--line)] px-4"><h2 id="mobile-filter-title" className="font-semibold">{locale === "fr" ? "Filtres" : "Filters"}</h2><button type="button" onClick={() => setMobileFiltersOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)]" aria-label={t("common.close")}><X size={17} /></button></div>
            <div className="relative z-0 min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3">{filterPanel}</div>
            <div className="relative z-20 shrink-0 border-t border-[var(--line)] bg-[var(--background)] p-3"><Button className="w-full" onClick={() => setMobileFiltersOpen(false)}>{locale === "fr" ? `Voir ${total.toLocaleString(locale)} résultats` : `View ${total.toLocaleString(locale)} results`}</Button></div>
          </motion.div>
        </div>
      )}
      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin text-[var(--signal-strong)]" size={32} /></div>}><SearchContent /></Suspense>;
}
