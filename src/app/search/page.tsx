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
  Layers3,
  Link2,
  Minus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SearchFilterPanel } from "@/components/search/SearchFilterPanel";
import { SearchCommand, type SearchResultView } from "@/components/search/SearchCommand";
import {
  SimilarityCommandContent,
  SimilaritySearchWorkspace,
  similarityInputError,
  useSimilaritySearchController,
} from "@/components/search/SimilaritySearchWorkspace";
import { Button } from "@/components/ui/Button";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { MobileFilterSheet } from "@/components/ui/MobileFilterSheet";
import { Select } from "@/components/ui/Select";
import { useSimilarityCapabilities, useAlbums, useSearchFilters, useTracks } from "@/hooks/use-api";
import { useI18n } from "@/components/providers/I18nProvider";
import { canonicalizeCategoryValues, findSearchFilterId } from "@/lib/search-intent";
import { canonicalSearchFilterLabel, canonicalSearchFilterName } from "@/lib/search-filter-labels";
import { normalizeSearchText } from "@/lib/search-normalization";
import { looksLikeExternalUrl } from "@/lib/search/similarity-platforms";
import { cn, formatDuration } from "@/lib/utils";
import type { SimilaritySearchSource, Album, AutocompleteItem, SearchFacets, SearchFilterGroupKey, SearchFilterItem, SearchMode, SearchTranslationMode, SortMode, Track } from "@/types";
import { useSession } from "@/lib/auth-client";
import { clearSimilarityHandoff, useSimilarityHandoff } from "@/stores/similarity-handoff-store";

const TrackRow = dynamic(
  () => import("@/components/features/TrackRow").then((module) => module.TrackRow),
  { ssr: false, loading: () => <div className="grid min-h-20 place-items-center border-b border-[var(--line)] bg-[var(--surface-soft)]"><ParigoLoader size="compact" /></div> },
);

type ResultView = SearchResultView;
type Density = "full" | "mid" | "light";
type VersionType = "main" | "all";

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
    label: track.albumLabel || "",
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
  const initialSearchMode: SearchMode = searchParams.get("mode") === "ai" ? "ai" : "keyword";
  const rawSimilaritySource = searchParams.get("source");
  const initialSimilaritySource: SimilaritySearchSource = rawSimilaritySource === "track" || rawSimilaritySource === "upload" || rawSimilaritySource === "url" ? rawSimilaritySource : "prompt";
  const initialSimilaritySeedIds = [...new Set([
    ...csv(searchParams.get("seeds")),
    ...searchParams.getAll("seed").flatMap(csv),
  ])].slice(0, 10);
  const legacyKeyword = searchParams.get("keyword") ?? searchParams.get("brief") ?? "";
  const rawInitialQuery = searchParams.get("q") ?? legacyKeyword;
  const initialQuery = stripQuotes(rawInitialQuery);
  const legacyEntries = useMemo(() => ([
    ["category", null],
    ["genre", "genre"],
    ["mood", "moods"],
    ["instrument", "instruments"],
  ] as const).flatMap(([param, group]) => searchParams.getAll(param).flatMap(csv).map((value) => ({ value, group }))), [searchParams]);
  const legacyRaw = useMemo(() => legacyEntries.map(({ value }) => value), [legacyEntries]);

  const [query, setQuery] = useState(initialQuery);
  const [queryDraft, setQueryDraft] = useState(initialQuery);
  const [searchMode, setSearchMode] = useState<SearchMode>(initialSearchMode);
  const [similaritySource, setSimilaritySource] = useState<SimilaritySearchSource>(initialSimilaritySource);
  const [similarityPrompt, setSimilarityPrompt] = useState(initialSearchMode === "ai" && initialSimilaritySource === "prompt" ? initialQuery : "");
  const initialSimilarityHandoff = useSimilarityHandoff();
  const legacyTranslate = searchParams.get("translate");
  const initialTranslation = searchParams.get("translation");
  const [translation, setTranslation] = useState<SearchTranslationMode>(
    initialTranslation === "apply" || initialTranslation === "off"
      ? initialTranslation
      : legacyTranslate === "1" ? "apply" : legacyTranslate === "0" ? "off" : "offer",
  );
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
  const [styles, setStyles] = useState<string[]>(sorted(csv(searchParams.get("styles"))));
  const [composers, setComposers] = useState<string[]>(searchParams.get("composer") ? [searchParams.get("composer")!] : []);
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
  const searchWorkspaceRef = useRef<HTMLDivElement>(null);
  const similarityCapabilitiesQuery = useSimilarityCapabilities();
  const aiEnabled = Boolean(similarityCapabilitiesQuery.data && (
    similarityCapabilitiesQuery.data.track.enabled
    || similarityCapabilitiesQuery.data.prompt.enabled
    || similarityCapabilitiesQuery.data.upload.enabled
    || similarityCapabilitiesQuery.data.externalUrl.enabled
  ));


  const filtersQuery = useSearchFilters(locale);
  const filterGroups = useMemo(() => filtersQuery.data ?? [], [filtersQuery.data]);
  const allFilterItems = useMemo(() => filterGroups.flatMap((group) => flatten(group.items)), [filterGroups]);
  const itemNames = useMemo(() => new Map(filterGroups.flatMap((group) => flatten(group.items).map((item) => (
    [item.id, canonicalSearchFilterLabel(group.key, item, locale)] as const
  )))), [filterGroups, locale]);
  const filterItemsById = useMemo(() => new Map(filterGroups.flatMap((group) => flatten(group.items).map((item) => [item.id, { group, item }] as const))), [filterGroups]);
  const selectedAutocompleteFilters = useMemo(() => [...categories, ...styles]
    .filter((value) => !value.startsWith("-"))
    .flatMap((value) => {
      const resolved = filterItemsById.get(value);
      if (!resolved) return [];
      const localized = resolved.item.localizedName || resolved.item.name;
      const canonical = canonicalSearchFilterName(resolved.item);
      return [{
        id: value,
        kind: "filter" as const,
        label: canonicalSearchFilterLabel(resolved.group.key, resolved.item, locale),
        filterGroup: resolved.group.key,
        canonicalName: canonical,
        localizedName: localized,
      }];
    }), [categories, filterItemsById, locale, styles]);

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
      [item.name, item.canonicalName, item.localizedName].forEach((name) => {
        const key = normalizeSearchText(name ?? "");
        if (key && !names.has(key)) names.set(key, item.id);
      });
    });
    const resolved = legacyEntries.flatMap(({ value, group }) => {
      const canonical = categoryId(value);
      if (canonical) return [canonical];
      const unsigned = value.replace(/^-/, "");
      const id = group
        ? findSearchFilterId(filterGroups, group as SearchFilterGroupKey, unsigned)
        : names.get(normalizeSearchText(unsigned));
      return id ? [`${value.startsWith("-") ? "-" : ""}${id}`] : [];
    });
    if (!resolved.length) return;
    const frame = window.requestAnimationFrame(() => setCategories((current) => sorted([...current, ...resolved])));
    return () => window.cancelAnimationFrame(frame);
  }, [allFilterItems, filterGroups, legacyEntries]);

  const updateCategories = useCallback((values: string[]) => {
    setCategories(sorted(values));
    setPage(1);
  }, []);
  const updateLabels = useCallback((values: string[]) => { setLabels(sorted(values)); setPage(1); }, []);
  const updateStyles = useCallback((values: string[]) => { setStyles(sorted(values)); setPage(1); }, []);
  const updateComposers = useCallback((values: string[]) => {
    setComposers(values.slice(-1));
    setPage(1);
  }, []);
  const updateBpm = useCallback((value: [number, number]) => {
    setBpmRange(value);
    setPage(1);
  }, []);
  const updateDuration = useCallback((value: [number, number]) => { setDurationRange(value); setPage(1); }, []);

  useEffect(() => {
    // On mobile the filter sheet is an explicit apply surface. Deferring the URL
    // replacement keeps the focus trap and scroll position stable while users
    // make several selections; closing the sheet commits the canonical URL.
    if (mobileFiltersOpen || searchMode === "ai") return;
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (query && translation !== "offer") params.set("translation", translation);
    params.set("view", view);
    params.set("type", type);
    if (page > 1) params.set("page", String(page));
    if (sort !== "relevance") params.set("sort", sort);
    if (density !== "full") params.set("density", density);
    if (labels.length) params.set("labels", sorted(labels).join(","));
    if (styles.length) params.set("styles", sorted(styles).join(","));
    if (composers[0]) params.set("composer", composers[0]);
    if (categories.length) params.set("categories", sorted(categories).join(","));
    if (bpmRange[0] !== DEFAULT_BPM[0]) params.set("bpmMin", String(bpmRange[0]));
    if (bpmRange[1] !== DEFAULT_BPM[1]) params.set("bpmMax", String(bpmRange[1]));
    if (durationRange[0] !== DEFAULT_DURATION[0]) params.set("durationMin", String(durationRange[0]));
    if (durationRange[1] !== DEFAULT_DURATION[1]) params.set("durationMax", String(durationRange[1]));
    const next = params.toString();
    if (next !== searchParams.toString()) {
      const replaceUrl = () => {
        window.history.replaceState(window.history.state, "", `${localizedPath("/search")}${next ? `?${next}` : ""}`);
      };
      // Replacing the URL while the initial document is still loading can
      // cancel browser automation navigations and, more importantly, confuse
      // assistive history announcements. Canonicalize after the load event;
      // subsequent filter and text changes still update immediately.
      if (document.readyState === "complete") replaceUrl();
      else {
        window.addEventListener("load", replaceUrl, { once: true });
        return () => window.removeEventListener("load", replaceUrl);
      }
    }
  }, [bpmRange, categories, composers, density, durationRange, labels, localizedPath, mobileFiltersOpen, page, query, searchMode, searchParams, sort, styles, translation, type, view]);

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
    setComposers([]);
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
    composers,
    categories,
    minBpm: bpmRange[0] !== DEFAULT_BPM[0] ? bpmRange[0] : undefined,
    maxBpm: bpmRange[1] !== DEFAULT_BPM[1] ? bpmRange[1] : undefined,
    minDuration: durationRange[0] !== DEFAULT_DURATION[0] ? durationRange[0] : undefined,
    maxDuration: durationRange[1] !== DEFAULT_DURATION[1] ? durationRange[1] : undefined,
    type,
    language: locale,
    sort,
    translation,
  }), [bpmRange, categories, composers, durationRange, labels, locale, page, query, sort, styles, translation, type]);
  const debouncedParams = useDebounced(requestParams, 300);
  const tracksQuery = useTracks(debouncedParams, searchMode === "keyword" && view === "tracks");
  const albumsQuery = useAlbums({ ...debouncedParams, forceSearch: true, sort }, searchMode === "keyword" && view === "albums");
  const activeQuery = view === "tracks" ? tracksQuery : albumsQuery;
  const tracks = useMemo(() => tracksQuery.data?.tracks ?? [], [tracksQuery.data?.tracks]);
  const trackQueue = useMemo(
    () => tracks.flatMap((track) => [track, ...(type === "all" ? track.alternateTracks ?? [] : [])]),
    [tracks, type],
  );
  const albums = albumsQuery.data?.albums ?? [];
  const total = view === "tracks" ? tracksQuery.data?.pagination.total ?? 0 : albumsQuery.data?.pagination.total ?? 0;
  const facets: SearchFacets | undefined = view === "tracks" ? tracksQuery.data?.facets : albumsQuery.data?.facets;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const goToPage = useCallback((nextPage: number) => {
    setPage(Math.max(1, Math.min(totalPages, nextPage)));
    window.requestAnimationFrame(() => {
      const workspaceTop = searchWorkspaceRef.current?.getBoundingClientRect().top;
      if (workspaceTop === undefined) return;
      window.scrollTo({
        top: Math.max(0, window.scrollY + workspaceTop - 74),
        behavior: "smooth",
      });
    });
  }, [totalPages]);
  const searchHistoryId = view === "tracks" ? tracksQuery.data?.searchHistoryId : albumsQuery.data?.searchHistoryId;
  const queryResolution = view === "tracks" ? tracksQuery.data?.queryResolution : albumsQuery.data?.queryResolution;
  const translationSuggestion = view === "tracks" ? tracksQuery.data?.translationSuggestion : albumsQuery.data?.translationSuggestion;
  const literalSearchHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("translation", "off");
    params.delete("translate");
    params.delete("page");
    return `${localizedPath("/search")}?${params.toString()}`;
  }, [localizedPath, searchParams]);
  const commitSearchDraft = useCallback((rawValue: string) => {
    const value = rawValue.trim();
    if (!value) {
      const searchChanged = Boolean(query);
      setQuery("");
      setTranslation("offer");
      if (searchChanged) setPage(1);
      return;
    }
    if (value.length < 2) return;
    const searchChanged = query !== value;
    setQuery(value);
    if (searchChanged) {
      setTranslation("offer");
      setPage(1);
    }
  }, [query]);

  const applyUnifiedSearch = (value = queryDraft) => {
    commitSearchDraft(value);
  };

  const clearUnifiedSearch = () => {
    setQueryDraft("");
    setQuery("");
    setTranslation("offer");
  };

  const switchSearchMode = (nextMode: SearchMode) => {
    setSearchMode(nextMode);
    const params = new URLSearchParams(window.location.search);
    if (nextMode === "ai") {
      params.set("mode", "ai");
      params.set("source", similaritySource);
      params.delete("page");
    } else {
      params.delete("mode");
      params.delete("source");
      params.delete("seed");
      params.delete("seeds");
    }
    window.history.replaceState(window.history.state, "", `${localizedPath("/search")}${params.size ? `?${params}` : ""}`);
  };

  const updateSimilaritySource = (nextSource: SimilaritySearchSource) => {
    setSimilaritySource(nextSource);
    if (searchMode !== "ai") return;
    const params = new URLSearchParams(window.location.search);
    params.set("mode", "ai");
    params.set("source", nextSource);
    window.history.replaceState(window.history.state, "", `${localizedPath("/search")}?${params}`);
  };

  const similarity = useSimilaritySearchController({
    source: similaritySource,
    prompt: similarityPrompt,
    initialSeedIds: initialSimilaritySeedIds,
    initialHandoff: initialSimilarityHandoff,
    onPromptChange: setSimilarityPrompt,
    onSourceChange: updateSimilaritySource,
  });
  const similarityInlineError = similarity.effectiveSource === "url" ? similarityInputError(similarity.url, locale) : similarity.fileError;

  const updateSimilarityText = (value: string) => {
    const partialUrl = /^(?:h|ht|htt|https?|https?:\/|https?:\/\/)?$/i.test(value.trim());
    if (looksLikeExternalUrl(value) || (similarity.effectiveSource === "url" && partialUrl)) {
      similarity.setUrl(value);
      if (similarity.effectiveSource !== "url") similarity.selectSource("url");
      return;
    }
    similarity.onPromptChange(value);
    if (similarity.effectiveSource !== "prompt") similarity.selectSource("prompt");
  };

  const selectSimilarityFiles = (files: File[]) => {
    similarity.selectSource("upload");
    void similarity.selectFiles(files);
  };

  const activeValues = [...categories, ...styles];
  const includedCount = activeValues.filter((value) => !value.startsWith("-")).length + labels.length + composers.length;
  const excludedCount = activeValues.filter((value) => value.startsWith("-")).length;
  const resultStart = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const resultEnd = Math.min(page * PAGE_SIZE, total);
  const removeValue = (value: string, source: "categories" | "labels" | "styles" | "composers") => {
    const setter = source === "categories" ? updateCategories : source === "labels" ? updateLabels : source === "styles" ? updateStyles : updateComposers;
    const values = source === "categories" ? categories : source === "labels" ? labels : source === "styles" ? styles : composers;
    setter(values.filter((item) => item !== value));
  };
  const selectSuggestion = (item: AutocompleteItem, remainingQuery?: string) => {
    if (item.kind === "filter" && item.filterGroup) {
      if (remainingQuery !== undefined) {
        setQueryDraft(remainingQuery);
        setQuery(remainingQuery);
        setTranslation("offer");
        setPage(1);
      }
      if (item.filterGroup === "styles") updateStyles([...styles, item.id]);
      else updateCategories([...categories, item.id]);
      return;
    }
    if (item.kind === "label") {
      updateLabels([...labels, item.id]);
      return;
    }
    if (item.kind === "composer") {
      updateComposers([item.label]);
      return;
    }
    if (item.href) {
      router.push(localizedPath(item.href));
      return;
    }
    setQueryDraft(item.label);
    setQuery(item.label);
    setTranslation("offer");
    setPage(1);
  };
  const applySuggestedTranslation = () => {
    const effectiveQuery = translationSuggestion?.effective.trim();
    if (!effectiveQuery) return;
    setQueryDraft(effectiveQuery);
    setQuery(effectiveQuery);
    setTranslation("off");
    setPage(1);
    window.requestAnimationFrame(() => {
      const input = document.getElementById("catalog-search");
      if (!(input instanceof HTMLInputElement)) return;
      input.focus();
      input.setSelectionRange(effectiveQuery.length, effectiveQuery.length);
    });
  };
  const dismissSuggestedTranslation = () => setTranslation("off");
  const openSaveSearch = () => {
    const fallback = query.replaceAll('"', "").trim() || (locale === "fr" ? "Ma recherche Parigo" : "My Parigo search");
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
      styles={styles}
      composers={composers}
      bpmRange={bpmRange}
      durationRange={durationRange}
      categoryFacets={facets?.categories ?? []}
      labelFacets={facets?.labels ?? []}
      styleFacets={facets?.styles ?? []}
      locale={locale}
      onCategoriesChange={updateCategories}
      onLabelsChange={updateLabels}
      onStylesChange={updateStyles}
      onComposersChange={updateComposers}
      onBpmChange={updateBpm}
      onDurationChange={updateDuration}
      onReset={resetFilters}
    />
  );

  return (
    <div className="page-shell flex min-h-screen min-w-0 flex-col overflow-x-clip">
      <Header />
      <main className="min-w-0 flex-1 overflow-x-clip pb-[var(--space-page-end)] pt-[74px]">
        <h1 className="sr-only">{t("common.search")}</h1>
        <div className="mx-auto grid max-w-[1920px] items-start gap-4 px-3 pb-3 pt-1 sm:px-4 sm:py-4 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
          {searchMode === "keyword" && <aside className="search-filter-sticky hidden overflow-y-auto pb-5 lg:block" aria-label={locale === "fr" ? "Filtres de recherche" : "Search filters"}>
            {filtersQuery.isLoading ? <div className="flex min-h-52 items-center justify-center rounded-xl border border-[var(--line)]"><ParigoLoader label={t("common.loading")} /></div> : filterPanel}
          </aside>}

          <section ref={searchWorkspaceRef} className={cn("min-w-0", searchMode === "ai" && "contents")} aria-live="polite">
            <div data-testid="search-workspace" className={cn("search-workspace relative z-40 mb-3 min-w-0 bg-[var(--background)] pb-2 pt-1 lg:sticky", searchMode === "ai" && "order-1 lg:col-start-2 lg:row-start-1")}>
              <SearchCommand
                id="catalog-search"
                value={queryDraft}
                locale={locale}
                onValueChange={setQueryDraft}
                onSubmit={applyUnifiedSearch}
                onSelect={selectSuggestion}
                onClear={clearUnifiedSearch}
                stagedFilters={selectedAutocompleteFilters}
                filterSelectionState="applied"
                autocompleteEnabled={!(translation === "offer" && Boolean(translationSuggestion))}
                autocompleteContext={{
                  categories,
                  styles,
                  labels,
                  composer: composers[0],
                  minBpm: bpmRange[0] !== DEFAULT_BPM[0] ? bpmRange[0] : undefined,
                  maxBpm: bpmRange[1] !== DEFAULT_BPM[1] ? bpmRange[1] : undefined,
                  minDuration: durationRange[0] !== DEFAULT_DURATION[0] ? durationRange[0] : undefined,
                  maxDuration: durationRange[1] !== DEFAULT_DURATION[1] ? durationRange[1] : undefined,
                  type,
                  sort,
                }}
                onRemoveStagedFilter={(item) => {
                  if (item.filterGroup === "styles") updateStyles(styles.filter((value) => value.replace(/^-/, "") !== item.id));
                  else updateCategories(categories.filter((value) => value.replace(/^-/, "") !== item.id));
                }}
                mode={searchMode}
                onModeChange={switchSearchMode}
                aiEnabled={aiEnabled}
                aiSource={similarity.effectiveSource}
                aiSubmitEnabled={similarity.canSubmit}
                aiHasCriteria={similarity.canSubmit}
                aiValue={similarity.effectiveSource === "url" ? similarity.url : similarity.prompt}
                onAiValueChange={updateSimilarityText}
                onAiSubmit={() => void similarity.submit()}
                aiInputType={similarity.effectiveSource === "url" ? "url" : "text"}
                aiInputLabel={similarity.effectiveSource === "url"
                  ? locale === "fr" ? "Lien public vers une référence musicale" : "Public link to a music reference"
                  : locale === "fr" ? "Décrire la musique recherchée" : "Describe the music you need"}
                aiPlaceholder={similarity.effectiveSource === "url"
                  ? locale === "fr" ? "Collez un lien YouTube, Spotify, Vimeo, SoundCloud, Apple Music ou TikTok…" : "Paste a YouTube, Spotify, Vimeo, SoundCloud, Apple Music or TikTok link…"
                  : locale === "fr" ? "Décrivez une scène, une émotion, un rythme ou un usage…" : "Describe a scene, emotion, rhythm or use…"}
                aiSubmitLabel={similarity.effectiveSource === "track"
                  ? locale === "fr" ? `Trouver des pistes similaires (${similarity.seedIds.length})` : `Find similar tracks (${similarity.seedIds.length})`
                  : similarity.effectiveSource === "prompt"
                    ? locale === "fr" ? "Lancer le brief" : "Run brief"
                    : similarity.effectiveSource === "upload"
                      ? locale === "fr" ? "Envoyer et analyser" : "Upload and analyse"
                      : locale === "fr" ? "Analyser le lien" : "Analyse link"}
                aiCustomContent={similarity.effectiveSource === "track" || similarity.effectiveSource === "upload" ? <SimilarityCommandContent controller={similarity} initialPickerOpen={initialSimilarityHandoff?.source === "track" && initialSimilarityHandoff.openPicker} onInitialPickerConsumed={() => clearSimilarityHandoff("track")} /> : undefined}
                aiLeadingContent={similarity.effectiveSource === "url" ? <Link2 size={18} className="text-[var(--text-muted)]" /> : undefined}
                aiRecentEnabled={similarity.effectiveSource === "prompt"}
                onAiFilesDrop={selectSimilarityFiles}
              />

              {searchMode === "ai" && similarity.fileStatus === "checking" ? <p role="status" className="mt-2 text-xs text-[var(--text-muted)]">{locale === "fr" ? "Vérification du fichier…" : "Checking file…"}</p> : null}
              {searchMode === "ai" && similarityInlineError ? <p role="alert" className="mt-2 text-xs font-medium text-[var(--danger)]">{similarityInlineError}</p> : null}

              {searchMode === "keyword" && <div className="search-toolbar mt-2 grid grid-cols-2 items-stretch gap-2 border border-[var(--line-strong)] bg-[var(--surface)] p-2 lg:flex lg:flex-wrap lg:justify-between">
                <div className="contents lg:flex lg:min-w-0 lg:flex-1 lg:flex-wrap lg:items-center lg:gap-2">
                  <button ref={mobileTriggerRef} type="button" onClick={() => setMobileFiltersOpen(true)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-[var(--line-strong)] px-3 text-xs font-semibold lg:hidden"><SlidersHorizontal size={15} />{locale === "fr" ? "Filtres" : "Filters"}{includedCount + excludedCount > 0 && <span className="bg-[var(--signal-strong)] px-1.5 font-mono text-white">{includedCount + excludedCount}</span>}</button>
                  <Select variant="editorial" caption={locale === "fr" ? "Résultats" : "Results"} value={view} onValueChange={(value) => { setView(value as ResultView); setPage(1); }} ariaLabel={locale === "fr" ? "Type de résultats" : "Result type"} className="w-full min-w-0 lg:w-auto lg:min-w-[10rem]" listboxClassName="search-mobile-select-listbox--left" options={[{ value: "tracks", label: locale === "fr" ? "Pistes" : "Tracks" }, { value: "albums", label: "Albums" }]} />
                  {view === "tracks" ? <Select variant="editorial" caption={locale === "fr" ? "Versions" : "Versions"} value={type} onValueChange={(value) => { setType(value); setPage(1); }} ariaLabel={locale === "fr" ? "Versions des pistes" : "Track versions"} className="w-full min-w-0 lg:w-auto lg:min-w-[11.5rem]" listboxClassName="search-mobile-select-listbox--left" options={[{ value: "main", label: locale === "fr" ? "Principales" : "Main versions" }, { value: "all", label: locale === "fr" ? "Toutes les versions" : "All versions" }]} /> : null}
                </div>
                <div className="contents lg:flex lg:min-w-0 lg:flex-wrap lg:items-stretch lg:justify-end lg:gap-2">
                  {view === "tracks" && tracks.length > 0 ? <Select variant="editorial" caption={locale === "fr" ? "Affichage" : "Display"} value={density} onValueChange={setDensity} ariaLabel={locale === "fr" ? "Niveau de détail des pistes" : "Track detail level"} className="w-full min-w-0 lg:w-auto lg:min-w-[10.5rem]" listboxClassName="search-mobile-select-listbox--right" options={[{ value: "full", label: locale === "fr" ? "Piste détaillée" : "Detailed track" }, { value: "mid", label: locale === "fr" ? "Piste compacte" : "Compact track" }, { value: "light", label: locale === "fr" ? "Piste essentielle" : "Essential track" }]} /> : null}
                  <Select variant="editorial" caption={locale === "fr" ? "Ordre" : "Order"} value={sort} onValueChange={(value) => { setSort(value); setPage(1); }} ariaLabel={locale === "fr" ? "Trier les résultats" : "Sort results"} className="w-full min-w-0 lg:w-auto lg:min-w-[9rem]" listboxClassName="search-mobile-select-listbox--left" options={[
                    { value: "relevance", label: locale === "fr" ? "Pertinence" : "Relevance" },
                    { value: "recent", label: locale === "fr" ? "Plus récents" : "Newest" },
                    { value: "oldest", label: locale === "fr" ? "Plus anciens" : "Oldest" },
                    { value: "title", label: "A–Z" },
                    { value: "title-desc", label: "Z–A" },
                  ]} />
                </div>
              </div>}

            </div>

            {searchMode === "ai" ? (
              <SimilaritySearchWorkspace controller={similarity} density={density} onDensityChange={setDensity} />
            ) : <>

            {(categories.length > 0 || labels.length > 0 || styles.length > 0 || composers.length > 0 || bpmRange[0] !== 50 || bpmRange[1] !== 200 || durationRange[0] !== 0 || durationRange[1] !== 300) && (
              <div className="search-active-filters mb-4 border border-[var(--line-strong)] bg-[var(--background)] p-3">
                <div className="mb-3 flex items-center justify-between gap-4"><p className="font-mono text-[.62rem] font-semibold uppercase tracking-[.1em]">{locale === "fr" ? `${includedCount} inclus · ${excludedCount} exclus` : `${includedCount} included · ${excludedCount} excluded`}</p><button type="button" onClick={resetFilters} className="inline-flex min-h-9 items-center gap-2 border border-[var(--line)] bg-[var(--surface)] px-3 text-[.68rem] font-semibold transition hover:border-[var(--signal-strong)] hover:text-[var(--signal-strong)]"><RotateCcw size={12} />{locale === "fr" ? "Tout effacer" : "Clear all"}</button></div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((value) => { const id = value.replace(/^-/, ""); const negative = value.startsWith("-"); return <button key={value} type="button" onClick={() => removeValue(value, "categories")} className={cn("search-chip inline-flex min-h-9 items-center gap-1.5 px-3 text-xs", negative ? "search-chip--excluded filter-chip-excluded" : "search-chip--included")}><span className={cn("search-chip__mark flex h-4 w-4 items-center justify-center", negative ? "bg-[var(--danger)] text-white" : "bg-[var(--signal-strong)] text-white")}>{negative ? <Minus size={10} /> : <Check size={10} />}</span>{itemNames.get(id) ?? id}<X size={12} /></button>; })}
                  {labels.map((value) => <button key={value} type="button" onClick={() => removeValue(value, "labels")} className="search-chip search-chip--included inline-flex min-h-9 items-center gap-1.5 px-3 text-xs"><span className="search-chip__mark flex h-4 w-4 items-center justify-center bg-[var(--signal-strong)] text-white"><Check size={10} /></span>{itemNames.get(value) ?? value}<X size={12} /></button>)}
                  {styles.map((value) => { const id = value.replace(/^-/, ""); const negative = value.startsWith("-"); return <button key={value} type="button" onClick={() => removeValue(value, "styles")} className={cn("search-chip inline-flex min-h-9 items-center gap-1.5 px-3 text-xs", negative ? "search-chip--excluded filter-chip-excluded" : "search-chip--included")}><span className={cn("search-chip__mark flex h-4 w-4 items-center justify-center", negative ? "bg-[var(--danger)] text-white" : "bg-[var(--signal-strong)] text-white")}>{negative ? <Minus size={10} /> : <Check size={10} />}</span>{itemNames.get(id) ?? id}<X size={12} /></button>; })}
                  {composers.map((value) => <button key={value} type="button" onClick={() => removeValue(value, "composers")} className="search-chip search-chip--included inline-flex min-h-9 items-center gap-1.5 px-3 text-xs"><span className="search-chip__mark flex h-4 w-4 items-center justify-center bg-[var(--signal-strong)] text-white"><Check size={10} /></span>{itemNames.get(value) ?? value}<X size={12} /></button>)}
                  {(bpmRange[0] !== 50 || bpmRange[1] !== 200) && <button type="button" onClick={() => updateBpm(DEFAULT_BPM)} className="search-chip inline-flex min-h-9 items-center gap-1.5 px-3 font-mono text-xs">BPM {bpmRange[0]}–{bpmRange[1]}<X size={12} /></button>}
                  {(durationRange[0] !== 0 || durationRange[1] !== 300) && <button type="button" onClick={() => updateDuration(DEFAULT_DURATION)} className="search-chip inline-flex min-h-9 items-center gap-1.5 px-3 font-mono text-xs">{formatDuration(durationRange[0])}–{formatDuration(durationRange[1])}<X size={12} /></button>}
                </div>
              </div>
            )}

            {translationSuggestion && translation === "offer" ? (
              <div className="search-query-resolution mb-4 flex flex-col gap-4 border border-[var(--signal-strong)] bg-[var(--color-primary-light)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" role="status">
                <div className="flex min-w-0 items-start gap-3 sm:items-center">
                  <span className="search-query-resolution__icon flex h-9 w-9 shrink-0 items-center justify-center bg-[var(--surface)] text-[var(--signal-strong)]" aria-hidden="true"><Sparkles size={16} /></span>
                  <p className="min-w-0 text-sm leading-6">
                    {locale === "fr" ? `Aucun résultat pour « ${translationSuggestion.original} ». Rechercher aussi « ${translationSuggestion.effective} » en anglais ?` : `No results for “${translationSuggestion.original}”. Also search for “${translationSuggestion.effective}” in English?`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={applySuggestedTranslation}>{locale === "fr" ? "Rechercher en anglais" : "Search in English"}</Button>
                  <Button variant="ghost" size="sm" onClick={dismissSuggestedTranslation}>{locale === "fr" ? "Non merci" : "No thanks"}</Button>
                </div>
              </div>
            ) : queryResolution && translation === "apply" ? (
              <div className="search-query-resolution mb-4 flex flex-col gap-4 border border-[var(--signal-strong)] bg-[var(--color-primary-light)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" role="status">
                <div className="flex min-w-0 items-start gap-3 sm:items-center">
                  <span className="search-query-resolution__icon flex h-9 w-9 shrink-0 items-center justify-center bg-[var(--surface)] text-[var(--signal-strong)]" aria-hidden="true"><Sparkles size={16} /></span>
                  <p className="min-w-0 text-sm leading-6">
                    <span>{locale === "fr" ? "Aucun résultat littéral. Recherche en anglais :" : "No literal results. Searching in English:"}</span>{" "}
                    <strong className="search-query-resolution__tag inline-flex max-w-full align-middle">{queryResolution.effective}</strong>
                  </p>
                </div>
                <a href={literalSearchHref} className="search-query-resolution__literal group/literal inline-flex min-h-10 shrink-0 items-center self-start px-1 text-xs font-semibold transition-colors hover:text-[var(--signal-strong)] focus-visible:text-[var(--signal-strong)] sm:self-center">
                  <span>{locale === "fr" ? `Chercher « ${queryResolution.original} » littéralement` : `Search literally for “${queryResolution.original}”`}</span>
                </a>
              </div>
            ) : null}

            <div className="search-results-status mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
              <span>{activeQuery.isFetching ? (locale === "fr" ? "Recherche…" : "Searching…") : `${resultStart}–${resultEnd} / ${total.toLocaleString(locale)}`}</span>
              {session?.user && <button type="button" onClick={openSaveSearch} disabled={!searchHistoryId || activeQuery.isFetching} className="inline-flex min-h-9 items-center gap-2 font-semibold text-[var(--foreground)] transition hover:text-[var(--signal-strong)] disabled:cursor-not-allowed disabled:opacity-35"><BookmarkPlus size={14} />{locale === "fr" ? "Sauvegarder" : "Save"}</button>}
            </div>

            {saveSearchOpen && <div className="mb-4 grid gap-3 border border-[var(--line-strong)] bg-[var(--surface)] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><label className="text-xs font-semibold"><span className="mb-2 block">{locale === "fr" ? "Nom de la recherche" : "Search name"}</span><input autoFocus value={saveSearchName} onChange={(event) => { setSaveSearchName(event.target.value); setSaveSearchState("idle"); setSaveSearchError(""); setSaveSearchRequestId(""); }} maxLength={160} className="min-h-11 w-full border border-[var(--line)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--foreground)]" /></label><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => setSaveSearchOpen(false)}>{locale === "fr" ? "Annuler" : "Cancel"}</Button><Button size="sm" disabled={!saveSearchName.trim() || !searchHistoryId || saveSearchState === "saving"} onClick={() => void saveCurrentSearch()}>{saveSearchState === "saving" ? <ParigoLoader size="icon" label={locale === "fr" ? "Enregistrement" : "Saving"} /> : <BookmarkPlus size={14} />}{saveSearchState === "saved" ? (locale === "fr" ? "Sauvegardée" : "Saved") : (locale === "fr" ? "Enregistrer" : "Save")}</Button></div>{saveSearchState === "error" && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--danger)] sm:col-span-2"><div><p>{saveSearchError}</p>{saveSearchRequestId && <p className="mt-1 font-mono text-[.62rem] opacity-65">Référence : {saveSearchRequestId}</p>}</div><Button variant="outline" size="sm" onClick={() => void verifySavedSearch()}>{locale === "fr" ? "Réessayer la vérification" : "Check again"}</Button></div>}</div>}

            {activeQuery.isLoading || activeQuery.isFetching && !activeQuery.data ? (
              <div className="flex min-h-96 items-center justify-center"><ParigoLoader size="page" label={t("common.loading")} /></div>
            ) : activeQuery.isError ? (
              <div className="rounded-xl border border-[var(--line)] px-5 py-24 text-center"><h2 className="text-3xl">{locale === "fr" ? "La recherche est temporairement indisponible." : "Search is temporarily unavailable."}</h2><p className="mt-3 text-sm text-[var(--text-muted)]">{locale === "fr" ? "Réessayez dans quelques instants." : "Please try again in a moment."}</p><Button variant="outline" onClick={() => activeQuery.refetch()} className="mt-7">{t("common.retry")}</Button></div>
            ) : view === "tracks" ? tracks.length ? (
                <div className="search-results-ledger overflow-visible border border-[var(--line-strong)] bg-[var(--surface)]">
                  <div className="search-results-ledger__header hidden min-h-10 items-center justify-between gap-6 border-b border-[var(--line-strong)] px-4 font-mono text-[.54rem] uppercase tracking-[.12em] text-[var(--text-muted)] xl:flex">
                    <span>{locale === "fr" ? "Titre · album · waveform" : "Title · album · waveform"}</span>
                    <span>{locale === "fr" ? "Tags · ambiance · tempo · durée · actions" : "Tags · mood · tempo · duration · actions"}</span>
                  </div>
                  {tracks.map((track, index) => {
                    const mainNumber = (page - 1) * PAGE_SIZE + index + 1;
                    const alternates = type === "all" ? track.alternateTracks ?? [] : [];
                    const stems = type === "all"
                      ? [...new Map(
                        [track, ...alternates]
                          .flatMap((version) => version.stems ?? [])
                          .map((stem) => [stem.id, stem]),
                      ).values()]
                      : [];
                    return (
                      <section key={track.id} data-search-track-group={track.id}>
                        <TrackRow track={track} album={albumFromTrack(track)} queue={trackQueue} index={(page - 1) * PAGE_SIZE + index} displayNumber={String(mainNumber)} showAlbumCover compact={density !== "full"} density={density} showCompleteActions mobileLayout="dense" />
                        {type === "all" && (alternates.length > 0 || stems.length > 0) && (
                          <div className="search-version-branch relative ml-5 border-l border-[color-mix(in_srgb,var(--signal)_58%,transparent)] pl-3 sm:ml-10 sm:pl-5">
                            <div className="flex min-h-9 flex-wrap items-center gap-3 border-b border-[var(--line)] px-2 font-mono text-[.56rem] uppercase tracking-[.1em] text-[var(--text-muted)]">
                              <span className="inline-flex items-center text-[var(--signal-strong)]">{alternates.length} {locale === "fr" ? "versions" : "versions"}</span>
                              {stems.length > 0 && <span className="inline-flex items-center gap-1.5"><Layers3 size={12} />{stems.length} stems</span>}
                            </div>
                            {alternates.map((alternate, alternateIndex) => (
                              <div key={alternate.id} data-track-kind="alternate">
                                <TrackRow track={alternate} album={albumFromTrack(alternate)} queue={trackQueue} index={(page - 1) * PAGE_SIZE + index + alternateIndex + 1} displayNumber={`${mainNumber}.${alternateIndex + 1}`} groupedVersion showAlbumCover={false} density="mid" showCompleteActions mobileLayout="dense" />
                              </div>
                            ))}
                            {stems.length > 0 && (
                              <div className="flex flex-wrap gap-2 border-b border-[var(--line)] bg-[var(--surface-soft)] px-3 py-3" aria-label={`${locale === "fr" ? "Stems disponibles pour" : "Available stems for"} ${track.title}`}>
                                {stems.map((stem) => <span key={stem.id} className="inline-flex min-h-7 items-center gap-1.5 border border-[var(--line)] bg-[var(--surface)] px-2 text-[.65rem] font-semibold"><Layers3 size={11} className="text-[var(--signal-strong)]" />{stem.title || (locale === "fr" ? "Stem sans titre" : "Untitled stem")}</span>)}
                              </div>
                            )}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
            ) : (
              <div className="rounded-xl border border-[var(--line)] px-5 py-24 text-center"><h2 className="text-4xl">{t("search.emptyTitle")}</h2><p className="mx-auto mt-4 max-w-xl text-sm text-[var(--text-muted)]">{t("search.emptyCopy")}</p><Button variant="outline" onClick={resetFilters} className="mt-6">{t("common.reset")}</Button></div>
            ) : albums.length ? (
                <div data-testid="search-album-grid" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {albums.map((album, index) => (
                    <article key={album.id} style={{ animationDelay: `${index * 18}ms` }} className="parigo-card animate-[fade-in_.25s_ease-out_both] border border-[var(--line)] bg-[var(--surface)] p-2.5">
                      <Link href={localizedPath(`/albums/${album.slug || album.id}`)} className="group block">
                        <div className="media-frame relative aspect-square overflow-hidden bg-[var(--surface-soft)]"><Image src={album.cover} alt={album.title} fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 20vw" className="object-contain transition duration-700 group-hover:scale-[1.025]" /></div>
                        <div className="py-3">
                          <h2 className="truncate text-base tracking-[-.025em]">{album.title}</h2>
                          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2"><p className="min-w-0 truncate text-[.68rem] text-[var(--text-muted)]">{album.label}</p>{album.code && <span className="album-reference-tag shrink-0">{locale === "fr" ? "Réf." : "Ref."} {album.code}</span>}</div>
                        </div>
                      </Link>
                    </article>
                  ))}
                </div>
            ) : (
              <div className="rounded-xl border border-[var(--line)] px-5 py-24 text-center"><h2 className="text-4xl">{t("search.emptyTitle")}</h2><Button variant="outline" onClick={resetFilters} className="mt-6">{t("common.reset")}</Button></div>
            )}

            {!activeQuery.isLoading && !activeQuery.isError && totalPages > 1 && (
              <nav className="mt-7 flex items-center justify-between border-t border-[var(--line)] pt-5" aria-label={locale === "fr" ? "Pagination des résultats" : "Results pagination"}>
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}><ChevronLeft size={16} />{locale === "fr" ? "Précédent" : "Previous"}</Button>
                <span className="font-mono text-[.65rem] uppercase tracking-[.12em] text-[var(--text-muted)]">Page {page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>{locale === "fr" ? "Suivant" : "Next"}<ChevronRight size={16} /></Button>
              </nav>
            )}
            </>}
          </section>
        </div>
      </main>

      {searchMode === "keyword" && mobileFiltersOpen && (
        <MobileFilterSheet
          ref={dialogRef}
          title={locale === "fr" ? "Filtres" : "Filters"}
          ariaLabel={locale === "fr" ? "Filtres" : "Filters"}
          closeLabel={t("common.close")}
          actionLabel={locale === "fr" ? `Voir ${total.toLocaleString(locale)} résultats` : `View ${total.toLocaleString(locale)} results`}
          onClose={() => setMobileFiltersOpen(false)}
        >
          {filterPanel}
        </MobileFilterSheet>
      )}
      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><ParigoLoader size="page" /></div>}><SearchContent /></Suspense>;
}
