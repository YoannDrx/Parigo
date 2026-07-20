"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Disc3,
  LayoutList,
  Loader2,
  RotateCcw,
  Rows3,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Header, Footer } from "@/components/layout";
import { AISearch, MiniPlayer, TrackRow } from "@/components/features";
import { Button } from "@/components/ui";
import { useGenres, useInstruments, useLabels, useMoods, useTracks } from "@/hooks/use-api";
import { useI18n } from "@/components/providers/I18nProvider";
import { localizeCatalogTerm } from "@/i18n/catalog-terms";
import { intentToSearchParams, parseSearchIntent } from "@/lib/search-intent";
import { cn, formatDuration } from "@/lib/utils";
import type { Album, Track } from "@/types";

type ResultView = "tracks" | "albums";
type Density = "comfortable" | "compact";
type SortMode = "relevance" | "recent" | "title" | "bpm-asc" | "bpm-desc" | "duration-asc" | "duration-desc";

const PAGE_SIZE = 30;

function stripQuotes(value: string) {
  return value.replace(/^['"]+|['"]+$/g, "");
}

function transformTrack(apiTrack: {
  id: string;
  slug?: string;
  title: string;
  duration: number;
  bpm?: number;
  key?: string;
  isVocal: boolean;
  audioUrl: string | null;
  waveform: number[] | null;
  albumId: string;
  albumTitle: string;
  albumSlug: string;
  albumCover: string;
  albumLabel?: string;
  albumLabelSlug?: string;
  genres: string[];
  moods: string[];
  instruments?: string[];
}): Track {
  return {
    id: apiTrack.id,
    slug: apiTrack.slug,
    title: apiTrack.title,
    duration: apiTrack.duration,
    bpm: apiTrack.bpm ?? null,
    key: apiTrack.key ?? null,
    isVocal: apiTrack.isVocal,
    audioUrl: apiTrack.audioUrl,
    waveform: apiTrack.waveform,
    albumId: apiTrack.albumId,
    albumTitle: apiTrack.albumTitle,
    albumSlug: apiTrack.albumSlug,
    albumCover: apiTrack.albumCover,
    albumLabel: apiTrack.albumLabel,
    albumLabelSlug: apiTrack.albumLabelSlug,
    genres: apiTrack.genres,
    moods: apiTrack.moods,
    instruments: apiTrack.instruments,
  };
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

function FilterSection({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <details open className="group border-b border-[var(--line)] py-1">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <span>{title}{count ? <span className="ml-2 font-mono text-[.58rem] opacity-45">{String(count).padStart(2, "0")}</span> : null}</span>
        <ChevronDown size={16} className="transition group-open:rotate-180" />
      </summary>
      <div className="pb-5 pt-1">{children}</div>
    </details>
  );
}

function Choice({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "min-h-10 border px-3 py-2 text-left text-xs transition",
        active
          ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
          : "border-[var(--line)] hover:border-[var(--foreground)]"
      )}
    >
      {children}
    </button>
  );
}

function SearchContent() {
  const { locale, t } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = stripQuotes(searchParams.get("q") || searchParams.get("keyword") || "");
  const initialIntent = parseSearchIntent(initialQuery);
  const initialGenres = searchParams.getAll("genre");
  const initialMoods = searchParams.getAll("mood");
  const initialInstruments = searchParams.getAll("instrument");

  const [query, setQuery] = useState(initialQuery);
  const [view, setView] = useState<ResultView>(searchParams.get("view") === "albums" ? "albums" : "tracks");
  const [density, setDensity] = useState<Density>(searchParams.get("density") === "compact" ? "compact" : "comfortable");
  const [sort, setSort] = useState<SortMode>((searchParams.get("sort") as SortMode) || "relevance");
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get("page")) || 1));
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const mobileFilterButtonRef = useRef<HTMLButtonElement>(null);
  const mobileFilterCloseRef = useRef<HTMLButtonElement>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(initialGenres.length ? initialGenres : initialIntent.genres);
  const [selectedMoods, setSelectedMoods] = useState<string[]>(initialMoods.length ? initialMoods : initialIntent.moods);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>(initialInstruments.length ? initialInstruments : initialIntent.instruments);
  const [selectedLabel, setSelectedLabel] = useState(searchParams.get("label") || "");
  const [bpmRange, setBpmRange] = useState<[number, number]>([
    Number(searchParams.get("minBpm")) || initialIntent.bpmRange?.[0] || 50,
    Number(searchParams.get("maxBpm")) || initialIntent.bpmRange?.[1] || 200,
  ]);
  const [durationRange, setDurationRange] = useState<[number, number]>([
    Number(searchParams.get("minDuration")) || 0,
    Number(searchParams.get("maxDuration")) || 300,
  ]);
  const [isVocal, setIsVocal] = useState<boolean | null>(
    searchParams.get("vocal") === "true"
      ? true
      : searchParams.get("vocal") === "false"
        ? false
        : initialIntent.isVocal
  );

  const parsedIntent = useMemo(() => parseSearchIntent(query), [query]);
  const { data: genresData } = useGenres();
  const { data: moodsData } = useMoods();
  const { data: instrumentsData } = useInstruments();
  const { data: labelsData } = useLabels({ limit: 60 });
  const genres = genresData?.genres ?? [];
  const moods = moodsData?.moods ?? [];
  const instruments = instrumentsData?.instruments ?? [];
  const labels = labelsData?.labels ?? [];

  useEffect(() => {
    document.body.style.overflow = mobileFiltersOpen ? "hidden" : "";
    if (!mobileFiltersOpen) return () => { document.body.style.overflow = ""; };
    const filterTrigger = mobileFilterButtonRef.current;
    mobileFilterCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileFiltersOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
      filterTrigger?.focus();
    };
  }, [mobileFiltersOpen]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("view", view);
    if (density === "compact") params.set("density", density);
    if (sort !== "relevance") params.set("sort", sort);
    if (page > 1) params.set("page", String(page));
    selectedGenres.forEach((value) => params.append("genre", value));
    selectedMoods.forEach((value) => params.append("mood", value));
    selectedInstruments.forEach((value) => params.append("instrument", value));
    if (selectedLabel) params.set("label", selectedLabel);
    if (bpmRange[0] !== 50) params.set("minBpm", String(bpmRange[0]));
    if (bpmRange[1] !== 200) params.set("maxBpm", String(bpmRange[1]));
    if (durationRange[0] !== 0) params.set("minDuration", String(durationRange[0]));
    if (durationRange[1] !== 300) params.set("maxDuration", String(durationRange[1]));
    if (isVocal !== null) params.set("vocal", String(isVocal));
    const next = params.toString();
    if (next !== searchParams.toString()) router.replace(`/search?${next}`, { scroll: false });
  }, [bpmRange, density, durationRange, isVocal, page, query, router, searchParams, selectedGenres, selectedInstruments, selectedLabel, selectedMoods, sort, view]);

  const apiParams = useMemo(() => {
    const hasStructuredCriteria = Boolean(
      selectedGenres.length || selectedMoods.length || selectedInstruments.length ||
      bpmRange[0] !== 50 || bpmRange[1] !== 200 || isVocal !== null
    );
    return {
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      query: hasStructuredCriteria ? undefined : (parsedIntent.freeText || query || undefined),
      genres: selectedGenres.length ? selectedGenres : undefined,
      moods: selectedMoods.length ? selectedMoods : undefined,
      instruments: selectedInstruments.length ? selectedInstruments : undefined,
      label: selectedLabel || undefined,
      minBpm: bpmRange[0] !== 50 ? bpmRange[0] : undefined,
      maxBpm: bpmRange[1] !== 200 ? bpmRange[1] : undefined,
      minDuration: durationRange[0] || undefined,
      maxDuration: durationRange[1] !== 300 ? durationRange[1] : undefined,
      isVocal: isVocal ?? undefined,
      sort,
    };
  }, [bpmRange, durationRange, isVocal, page, parsedIntent.freeText, query, selectedGenres, selectedInstruments, selectedLabel, selectedMoods, sort]);

  const { data: tracksData, isLoading, isError, refetch } = useTracks(apiParams);
  const tracks = useMemo(() => tracksData?.tracks.map(transformTrack) ?? [], [tracksData]);
  const totalCount = tracksData?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const albums = useMemo(() => Array.from(new Map(tracks.map((track) => [track.albumId, albumFromTrack(track)])).values()), [tracks]);

  const hasActiveFilters = Boolean(
    query || selectedGenres.length || selectedMoods.length || selectedInstruments.length || selectedLabel ||
    bpmRange[0] !== 50 || bpmRange[1] !== 200 || durationRange[0] !== 0 || durationRange[1] !== 300 || isVocal !== null
  );

  const handleAssistedSearch = useCallback((value: string) => {
    const intent = parseSearchIntent(value);
    setQuery(value);
    setSelectedGenres(intent.genres);
    setSelectedMoods(intent.moods);
    setSelectedInstruments(intent.instruments);
    setBpmRange(intent.bpmRange ?? [50, 200]);
    setIsVocal(intent.isVocal);
    setPage(1);
    const params = intentToSearchParams(intent);
    params.set("view", view);
    router.replace(`/search?${params.toString()}`, { scroll: false });
  }, [router, view]);

  const resetFilters = useCallback(() => {
    setQuery("");
    setSelectedGenres([]);
    setSelectedMoods([]);
    setSelectedInstruments([]);
    setSelectedLabel("");
    setBpmRange([50, 200]);
    setDurationRange([0, 300]);
    setIsVocal(null);
    setPage(1);
  }, []);

  const toggle = (value: string, values: string[], setter: (next: string[]) => void) => {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
    setPage(1);
  };

  const suggestions = locale === "fr"
    ? ["Techno pulsée, sombre, sans voix", "Piano intime pour documentaire", "Pop solaire à 120 BPM", "Cordes tendues et cinématiques"]
    : ["Pulsing dark techno, no vocals", "Intimate piano for documentary", "Bright pop at 120 BPM", "Tense cinematic strings"];

  const filterPanel = (
    <div className="border border-[var(--line)] bg-[var(--background)] p-5">
      <div className="mb-3 flex items-center justify-between border-b border-[var(--line)] pb-4">
        <h2 className="eyebrow">{t("search.filters")}</h2>
        {hasActiveFilters && <button type="button" onClick={resetFilters} className="inline-flex min-h-10 items-center gap-2 text-xs hover:underline"><RotateCcw size={14} />{t("common.reset")}</button>}
      </div>
      <FilterSection title="Labels" count={selectedLabel ? 1 : 0}>
        <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto pr-1">
          {labels.map((label) => <Choice key={label.slug || label.id} active={selectedLabel === label.slug} onClick={() => { setSelectedLabel(selectedLabel === label.slug ? "" : label.slug || ""); setPage(1); }}>{label.name}</Choice>)}
        </div>
      </FilterSection>
      <FilterSection title={locale === "fr" ? "Genres" : "Genres"} count={selectedGenres.length}>
        <div className="flex flex-wrap gap-2">{genres.map((genre) => <Choice key={genre.slug} active={selectedGenres.includes(genre.slug)} onClick={() => toggle(genre.slug, selectedGenres, setSelectedGenres)}>{localizeCatalogTerm(genre.slug, locale)}</Choice>)}</div>
      </FilterSection>
      <FilterSection title={locale === "fr" ? "Ambiances" : "Moods"} count={selectedMoods.length}>
        <div className="flex flex-wrap gap-2">{moods.map((mood) => <Choice key={mood.slug} active={selectedMoods.includes(mood.slug)} onClick={() => toggle(mood.slug, selectedMoods, setSelectedMoods)}>{localizeCatalogTerm(mood.slug, locale)}</Choice>)}</div>
      </FilterSection>
      <FilterSection title="Instruments" count={selectedInstruments.length}>
        <div className="flex max-h-52 flex-wrap gap-2 overflow-y-auto pr-1">{instruments.map((instrument) => <Choice key={instrument.slug} active={selectedInstruments.includes(instrument.slug)} onClick={() => toggle(instrument.slug, selectedInstruments, setSelectedInstruments)}>{localizeCatalogTerm(instrument.slug, locale)}</Choice>)}</div>
      </FilterSection>
      <FilterSection title="Tempo / BPM" count={bpmRange[0] !== 50 || bpmRange[1] !== 200 ? 1 : 0}>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <label className="text-[.62rem] uppercase tracking-[.12em] opacity-55">Min<input aria-label="BPM minimum" type="number" min={50} max={bpmRange[1]} value={bpmRange[0]} onChange={(event) => { setBpmRange([Number(event.target.value) || 50, bpmRange[1]]); setPage(1); }} className="mt-2 h-11 w-full border border-[var(--line)] bg-transparent px-3 font-mono text-sm" /></label>
          <span className="mt-5 opacity-35">—</span>
          <label className="text-[.62rem] uppercase tracking-[.12em] opacity-55">Max<input aria-label="BPM maximum" type="number" min={bpmRange[0]} max={240} value={bpmRange[1]} onChange={(event) => { setBpmRange([bpmRange[0], Number(event.target.value) || 200]); setPage(1); }} className="mt-2 h-11 w-full border border-[var(--line)] bg-transparent px-3 font-mono text-sm" /></label>
        </div>
      </FilterSection>
      <FilterSection title={locale === "fr" ? "Durée" : "Duration"} count={durationRange[0] !== 0 || durationRange[1] !== 300 ? 1 : 0}>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <label className="text-[.62rem] uppercase tracking-[.12em] opacity-55">Min<input aria-label={locale === "fr" ? "Durée minimum en secondes" : "Minimum duration in seconds"} type="number" min={0} max={durationRange[1]} value={durationRange[0]} onChange={(event) => { setDurationRange([Number(event.target.value) || 0, durationRange[1]]); setPage(1); }} className="mt-2 h-11 w-full border border-[var(--line)] bg-transparent px-3 font-mono text-sm" /></label>
          <span className="mt-5 opacity-35">—</span>
          <label className="text-[.62rem] uppercase tracking-[.12em] opacity-55">Max<input aria-label={locale === "fr" ? "Durée maximum en secondes" : "Maximum duration in seconds"} type="number" min={durationRange[0]} max={1200} value={durationRange[1]} onChange={(event) => { setDurationRange([durationRange[0], Number(event.target.value) || 300]); setPage(1); }} className="mt-2 h-11 w-full border border-[var(--line)] bg-transparent px-3 font-mono text-sm" /></label>
        </div>
        <p className="mt-3 font-mono text-[.62rem] opacity-45">{formatDuration(durationRange[0])} — {formatDuration(durationRange[1])}</p>
      </FilterSection>
      <FilterSection title={locale === "fr" ? "Présence vocale" : "Vocals"} count={isVocal === null ? 0 : 1}>
        <div className="grid grid-cols-3 gap-2">
          <Choice active={isVocal === null} onClick={() => { setIsVocal(null); setPage(1); }}>{locale === "fr" ? "Toutes" : "All"}</Choice>
          <Choice active={isVocal === true} onClick={() => { setIsVocal(true); setPage(1); }}>Vocal</Choice>
          <Choice active={isVocal === false} onClick={() => { setIsVocal(false); setPage(1); }}>Instrumental</Choice>
        </div>
      </FilterSection>
    </div>
  );

  const resultStart = totalCount ? (page - 1) * PAGE_SIZE + 1 : 0;
  const resultEnd = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-28">
        <section className="border-b border-[var(--line)] bg-[var(--surface)] px-4 pb-12 pt-32 text-[var(--foreground)] sm:px-6 md:pb-16 md:pt-40 lg:px-8">
          <div className="mx-auto max-w-[1800px]">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-5">
                <p className="eyebrow mb-5 text-[var(--signal-strong)]">{t("search.eyebrow")}</p>
                <h1 className="max-w-[10ch] text-[clamp(3.25rem,6vw,7rem)] font-semibold leading-[.88] tracking-[-.06em]">{t("search.title")}</h1>
              </div>
              <div className="lg:col-span-6 lg:col-start-7">
                <p className="mb-6 max-w-2xl text-base leading-relaxed text-[var(--text-muted)] md:text-lg">{t("search.intro")}</p>
                <AISearch compact defaultValue={query} onSearch={handleAssistedSearch} />
              </div>
            </div>
            <div className="mt-8 flex gap-2 overflow-x-auto pb-2" aria-label={locale === "fr" ? "Suggestions de recherche" : "Search suggestions"}>
              {suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => handleAssistedSearch(suggestion)} className="min-h-11 shrink-0 rounded-full border border-[var(--line)] px-4 text-left text-xs text-[var(--text-muted)] transition hover:border-[var(--signal)] hover:text-[var(--foreground)]">{suggestion}</button>)}
            </div>
          </div>
        </section>

        <div className="mx-auto grid w-full max-w-[1800px] gap-8 px-4 py-8 sm:px-6 md:py-12 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-8">
          <aside className="hidden self-start lg:sticky lg:top-24 lg:block">{filterPanel}</aside>

          <section aria-live="polite" aria-busy={isLoading}>
            <div className="mb-5 flex flex-col gap-4 border-b border-[var(--line)] pb-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-[.68rem] uppercase tracking-[.13em] opacity-58">{resultStart}—{resultEnd} / {totalCount} {totalCount === 1 ? t("search.result") : t("search.results")}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button ref={mobileFilterButtonRef} variant="outline" size="sm" onClick={() => setMobileFiltersOpen(true)} className="lg:hidden"><SlidersHorizontal size={16} />{t("search.filters")}</Button>
                  <label className="sr-only" htmlFor="search-sort">{locale === "fr" ? "Trier les résultats" : "Sort results"}</label>
                  <select id="search-sort" value={sort} onChange={(event) => { setSort(event.target.value as SortMode); setPage(1); }} className="h-11 border border-[var(--line)] bg-transparent px-3 text-xs">
                    <option value="relevance">{locale === "fr" ? "Pertinence" : "Relevance"}</option>
                    <option value="recent">{locale === "fr" ? "Parution récente" : "Newest release"}</option>
                    <option value="title">{locale === "fr" ? "Titre A—Z" : "Title A—Z"}</option>
                    <option value="bpm-asc">BPM ↑</option>
                    <option value="bpm-desc">BPM ↓</option>
                    <option value="duration-asc">{locale === "fr" ? "Durée ↑" : "Duration ↑"}</option>
                    <option value="duration-desc">{locale === "fr" ? "Durée ↓" : "Duration ↓"}</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex border border-[var(--line)]" role="group" aria-label={locale === "fr" ? "Type de résultats" : "Result type"}>
                  <button type="button" aria-pressed={view === "tracks"} onClick={() => { setView("tracks"); setPage(1); }} className={cn("flex min-h-11 items-center gap-2 px-4 text-xs transition", view === "tracks" && "bg-[var(--foreground)] text-[var(--background)]")}><LayoutList size={16} />{locale === "fr" ? "Pistes" : "Tracks"}</button>
                  <button type="button" aria-pressed={view === "albums"} onClick={() => { setView("albums"); setPage(1); }} className={cn("flex min-h-11 items-center gap-2 border-l border-[var(--line)] px-4 text-xs transition", view === "albums" && "bg-[var(--foreground)] text-[var(--background)]")}><Disc3 size={16} />Albums</button>
                </div>
                {view === "tracks" && <div className="flex border border-[var(--line)]" role="group" aria-label={t("search.density")}>
                  <button type="button" aria-pressed={density === "comfortable"} onClick={() => setDensity("comfortable")} className={cn("flex h-11 w-11 items-center justify-center transition", density === "comfortable" && "bg-[var(--foreground)] text-[var(--background)]")} title={t("search.comfortable")}><Rows3 size={17} /></button>
                  <button type="button" aria-pressed={density === "compact"} onClick={() => setDensity("compact")} className={cn("flex h-11 w-11 items-center justify-center border-l border-[var(--line)] transition", density === "compact" && "bg-[var(--foreground)] text-[var(--background)]")} title={t("search.compact")}><LayoutList size={17} /></button>
                </div>}
              </div>
            </div>

            {hasActiveFilters && <div className="mb-6 flex flex-wrap gap-2">
              {selectedGenres.map((value) => <Choice key={`genre-${value}`} active onClick={() => toggle(value, selectedGenres, setSelectedGenres)}>{localizeCatalogTerm(value, locale)} <X className="ml-1 inline" size={12} /></Choice>)}
              {selectedMoods.map((value) => <Choice key={`mood-${value}`} active onClick={() => toggle(value, selectedMoods, setSelectedMoods)}>{localizeCatalogTerm(value, locale)} <X className="ml-1 inline" size={12} /></Choice>)}
              {selectedLabel && <Choice active onClick={() => { setSelectedLabel(""); setPage(1); }}>{labels.find((label) => label.slug === selectedLabel)?.name || selectedLabel} <X className="ml-1 inline" size={12} /></Choice>}
              <button type="button" onClick={resetFilters} className="min-h-10 px-3 text-xs underline decoration-current/30 underline-offset-4">{t("common.reset")}</button>
            </div>}

            {isLoading ? (
              <div className="flex min-h-80 items-center justify-center"><Loader2 className="animate-spin text-[var(--color-primary)]" size={34} /><span className="sr-only">{t("common.loading")}</span></div>
            ) : isError ? (
              <div className="border border-[var(--line)] px-5 py-24 text-center"><h2 className="font-[var(--font-editorial)] text-5xl tracking-[-.045em]">{t("search.errorTitle")}</h2><Button variant="outline" onClick={() => refetch()} className="mt-7">{t("common.retry")}</Button></div>
            ) : tracks.length === 0 ? (
              <div className="border border-[var(--line)] px-5 py-24 text-center"><h2 className="font-[var(--font-editorial)] text-5xl tracking-[-.045em] md:text-7xl">{t("search.emptyTitle")}</h2><p className="mx-auto mt-5 max-w-xl text-[var(--text-muted)]">{t("search.emptyCopy")}</p><Button variant="outline" onClick={resetFilters} className="mt-7">{t("common.reset")}</Button></div>
            ) : view === "tracks" ? (
              <div className="border-y border-[var(--line)]">
                {tracks.map((track, index) => <TrackRow key={track.id} track={track} album={albumFromTrack(track)} queue={tracks} index={(page - 1) * PAGE_SIZE + index} showAlbumCover compact={density === "compact"} />)}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {albums.map((album, index) => <motion.article key={album.id} initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }} className="border border-[var(--line)] bg-[var(--background)] p-3">
                  <Link href={`/albums/${album.slug || album.id}`} className="group block">
                    <div className="relative aspect-square overflow-hidden bg-[var(--surface-soft)]"><Image src={album.cover} alt={album.title} fill sizes="(max-width:640px) 100vw, (max-width:1280px) 50vw, 30vw" className="object-cover transition duration-700 group-hover:scale-[1.035]" /></div>
                    <div className="flex items-start justify-between gap-4 py-4"><div><h2 className="font-[var(--font-editorial)] text-3xl tracking-[-.04em]">{album.title}</h2><p className="mt-1 text-xs text-[var(--text-muted)]">{album.label}</p></div><span className="font-mono text-[.58rem] opacity-42">{String(index + 1).padStart(2, "0")}</span></div>
                  </Link>
                </motion.article>)}
              </div>
            )}

            {!isLoading && !isError && totalPages > 1 && <nav className="mt-8 flex items-center justify-between border-t border-[var(--line)] pt-5" aria-label={locale === "fr" ? "Pagination des résultats" : "Results pagination"}>
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setPage((value) => Math.max(1, value - 1)); window.scrollTo({ top: 420, behavior: "smooth" }); }}><ChevronLeft size={16} />{locale === "fr" ? "Précédent" : "Previous"}</Button>
              <span className="font-mono text-[.65rem] uppercase tracking-[.13em] opacity-58">{locale === "fr" ? "Page" : "Page"} {page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => { setPage((value) => Math.min(totalPages, value + 1)); window.scrollTo({ top: 420, behavior: "smooth" }); }}>{locale === "fr" ? "Suivant" : "Next"}<ChevronRight size={16} /></Button>
            </nav>}
          </section>
        </div>
      </main>

      {mobileFiltersOpen && <div className="fixed inset-0 z-[90] lg:hidden" role="dialog" aria-modal="true" aria-label={t("search.filters")}>
        <button type="button" className="absolute inset-0 bg-black/58 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)} aria-label={t("common.close")} />
        <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-y-0 right-0 w-[min(92vw,430px)] overflow-y-auto bg-[var(--background)] p-4 shadow-2xl">
          <div className="sticky top-0 z-10 mb-4 flex items-center justify-between border-b border-[var(--line)] bg-[var(--background)] py-3"><p className="eyebrow">{t("search.filters")}</p><button ref={mobileFilterCloseRef} type="button" onClick={() => setMobileFiltersOpen(false)} className="flex h-11 w-11 items-center justify-center border border-[var(--line)]" aria-label={t("common.close")}><X size={18} /></button></div>
          {filterPanel}
          <Button variant="primary" className="sticky bottom-4 mt-4 w-full" onClick={() => setMobileFiltersOpen(false)}>{locale === "fr" ? `Voir ${totalCount} résultats` : `View ${totalCount} results`}</Button>
        </motion.aside>
      </div>}

      <Footer />
      <MiniPlayer />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin text-[var(--color-primary)]" size={34} /></div>}>
      <SearchContent />
    </Suspense>
  );
}
