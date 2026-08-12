"use client";

import Image from "next/image";
import {
  ArrowRight,
  Disc3,
  Library,
  ListMusic,
  Music2,
  Quote,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { AutocompleteGroup, AutocompleteItem, QueryResolution } from "@/types";
import { autocompleteItemIndex } from "@/hooks/use-search-autocomplete";
import { resizeArtworkSource } from "@/lib/image-loader";
import { cn } from "@/lib/utils";

const groupLabels = {
  tracks: { fr: "Pistes", en: "Tracks" },
  albums: { fr: "Albums", en: "Albums" },
  playlists: { fr: "Playlists", en: "Playlists" },
  labels: { fr: "Labels", en: "Labels" },
  composers: { fr: "Compositeurs", en: "Composers" },
  words: { fr: "Mots-clés", en: "Keywords" },
  lyrics: { fr: "Dans les paroles", en: "In lyrics" },
} as const;

interface SearchAutocompleteMenuProps {
  id: string;
  groups: AutocompleteGroup[];
  activeIndex: number;
  loading: boolean;
  error: boolean;
  locale: "fr" | "en";
  query: string;
  translationSuggestion?: QueryResolution;
  translationLoading?: boolean;
  onActiveIndexChange: (index: number) => void;
  onSelect: (item: AutocompleteItem) => void;
  onApplyTranslation?: () => void;
  onViewAll: () => void;
}

function SuggestionArtwork({ item, compact = false }: { item: AutocompleteItem; compact?: boolean }) {
  const size = compact ? 40 : 48;
  const dimension = compact ? "h-10 w-10" : "h-12 w-12";
  if (item.image) {
    return (
      <span className={cn("relative shrink-0 overflow-hidden rounded-xl bg-[var(--surface-soft)]", dimension)}>
        <Image
          src={resizeArtworkSource(item.image, size * 2)}
          alt=""
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      </span>
    );
  }
  const icon = item.kind === "album"
    ? <Disc3 size={19} />
    : item.kind === "playlist"
      ? <ListMusic size={19} />
      : item.kind === "lyrics"
        ? <Quote size={17} />
        : <Music2 size={19} />;
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[var(--signal-strong)]", dimension)} aria-hidden="true">
      {icon}
    </span>
  );
}

function entityKind(item: AutocompleteItem, locale: "fr" | "en"): string {
  if (item.kind === "album") return "Album";
  if (item.kind === "playlist") return "Playlist";
  return locale === "fr" ? "Piste" : "Track";
}

function EntityGroup({
  id,
  group,
  groups,
  activeIndex,
  locale,
  separated,
  onActiveIndexChange,
  onSelect,
}: {
  id: string;
  group: AutocompleteGroup;
  groups: AutocompleteGroup[];
  activeIndex: number;
  locale: "fr" | "en";
  separated: boolean;
  onActiveIndexChange: (index: number) => void;
  onSelect: (item: AutocompleteItem) => void;
}) {
  return (
    <section role="group" aria-labelledby={`${id}-${group.key}`} className={cn(separated && "mt-4 border-t border-[var(--line)] pt-4")}>
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <h3 id={`${id}-${group.key}`} className="flex items-center gap-2 text-sm font-semibold">
          {group.key === "playlists" ? <ListMusic size={15} aria-hidden="true" /> : group.key === "albums" ? <Library size={15} aria-hidden="true" /> : <Disc3 size={15} aria-hidden="true" />}
          {groupLabels[group.key][locale]}
        </h3>
        <span className="font-mono text-[.62rem] uppercase tracking-[.08em] text-[var(--text-muted)]">
          {group.items.length} {locale === "fr" ? "suggestion" : "suggestion"}{group.items.length > 1 ? "s" : ""}
        </span>
      </div>
      <div className="grid gap-1">
        {group.items.map((item) => {
          const index = autocompleteItemIndex(groups, item);
          const trackCount = item.trackCount
            ? `${item.trackCount} ${locale === "fr" ? "pistes" : "tracks"}`
            : "";
          return (
            <button
              key={`${item.kind}-${item.id}`}
              id={`${id}-option-${index}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onMouseEnter={() => onActiveIndexChange(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(item)}
              className={cn(
                "group/suggestion grid min-h-16 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl p-2 text-left transition",
                index === activeIndex
                  ? "bg-[var(--foreground)] text-[var(--background)]"
                  : "hover:bg-[var(--surface-soft)]",
              )}
            >
              <SuggestionArtwork item={item} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{item.label}</span>
                {(item.subtitle || trackCount) ? (
                  <span className="mt-1 block truncate font-mono text-[.62rem] opacity-65">
                    {[item.subtitle, trackCount].filter(Boolean).join(" · ")}
                  </span>
                ) : null}
              </span>
              <span className="hidden text-[.65rem] font-semibold uppercase tracking-[.08em] opacity-55 sm:block">
                {entityKind(item, locale)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SideGroup({
  id,
  group,
  groups,
  activeIndex,
  locale,
  onActiveIndexChange,
  onSelect,
}: {
  id: string;
  group: AutocompleteGroup;
  groups: AutocompleteGroup[];
  activeIndex: number;
  locale: "fr" | "en";
  onActiveIndexChange: (index: number) => void;
  onSelect: (item: AutocompleteItem) => void;
}) {
  const words = group.key === "words";
  return (
    <section role="group" aria-labelledby={`${id}-${group.key}`} className="not-first:mt-5">
      <h3 id={`${id}-${group.key}`} className="mb-2 text-sm font-semibold">{groupLabels[group.key][locale]}</h3>
      <div className={words ? "flex flex-wrap gap-2" : "grid gap-1"}>
        {group.items.map((item) => {
          const index = autocompleteItemIndex(groups, item);
          if (words) {
            return (
              <button
                key={`${item.kind}-${item.id}`}
                id={`${id}-option-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => onActiveIndexChange(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelect(item)}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--line)] px-3 text-xs font-semibold transition",
                  index === activeIndex
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "bg-[var(--background)] hover:border-[var(--signal-strong)] hover:text-[var(--signal-strong)]",
                )}
              >
                <Search size={12} aria-hidden="true" />{item.label}
              </button>
            );
          }
          return (
            <button
              key={`${item.kind}-${item.id}`}
              id={`${id}-option-${index}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onMouseEnter={() => onActiveIndexChange(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(item)}
              className={cn(
                "grid min-h-12 w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm transition",
                index === activeIndex
                  ? "bg-[var(--foreground)] text-[var(--background)]"
                  : "hover:bg-[var(--background)]",
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--background)] text-[var(--signal-strong)]" aria-hidden="true">
                {item.kind === "composer" ? <UserRound size={16} /> : <Library size={16} />}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{item.label}</span>
                <span className="mt-0.5 block text-[.65rem] opacity-60">
                  {item.kind === "composer"
                    ? locale === "fr" ? "Filtrer par compositeur" : "Filter by composer"
                    : locale === "fr" ? "Filtrer par label" : "Filter by label"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function LyricsGroup({
  id,
  group,
  groups,
  activeIndex,
  locale,
  onActiveIndexChange,
  onSelect,
}: {
  id: string;
  group: AutocompleteGroup;
  groups: AutocompleteGroup[];
  activeIndex: number;
  locale: "fr" | "en";
  onActiveIndexChange: (index: number) => void;
  onSelect: (item: AutocompleteItem) => void;
}) {
  return (
    <section role="group" aria-labelledby={`${id}-lyrics`} className="mt-5 border-t border-[var(--line)] pt-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 id={`${id}-lyrics`} className="flex items-center gap-2 text-sm font-semibold"><Quote size={14} aria-hidden="true" />{groupLabels.lyrics[locale]}</h3>
        <span className="font-mono text-[.58rem] uppercase tracking-[.08em] text-[var(--text-muted)]">{locale === "fr" ? "Recherche étendue" : "Extended search"}</span>
      </div>
      <div className="grid gap-1">
        {group.items.map((item) => {
          const index = autocompleteItemIndex(groups, item);
          return (
            <button
              key={`${item.kind}-${item.id}`}
              id={`${id}-option-${index}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onMouseEnter={() => onActiveIndexChange(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(item)}
              className={cn(
                "grid min-h-14 w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl p-2 text-left transition",
                index === activeIndex ? "bg-[var(--foreground)] text-[var(--background)]" : "hover:bg-[var(--background)]",
              )}
            >
              <SuggestionArtwork item={item} compact />
              <span className="min-w-0"><span className="block truncate text-sm font-semibold">{item.label}</span><span className="mt-1 block truncate text-[.65rem] opacity-60">{item.subtitle}</span></span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function SearchAutocompleteMenu({
  id,
  groups,
  activeIndex,
  loading,
  error,
  locale,
  query,
  translationSuggestion,
  translationLoading = false,
  onActiveIndexChange,
  onSelect,
  onApplyTranslation,
  onViewAll,
}: SearchAutocompleteMenuProps) {
  const mainGroups = ["tracks", "albums", "playlists"].flatMap((key) => {
    const group = groups.find((candidate) => candidate.key === key);
    return group ? [group] : [];
  });
  const sideGroups = ["words", "composers", "labels"].flatMap((key) => {
    const group = groups.find((candidate) => candidate.key === key);
    return group ? [group] : [];
  });
  const lyrics = groups.find((group) => group.key === "lyrics");
  const resultCount = groups.reduce((total, group) => total + group.items.length, 0);
  const hasResults = resultCount > 0;

  return (
    <div className="search-autocomplete-panel absolute left-0 right-0 top-full z-50 mt-3 overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
      <p className="sr-only" aria-live="polite">
        {loading
          ? locale === "fr" ? "Chargement des suggestions" : "Loading suggestions"
          : locale === "fr" ? `${resultCount} suggestions disponibles` : `${resultCount} suggestions available`}
      </p>
      {loading ? (
        <div id={id} role="listbox" aria-label={locale === "fr" ? "Suggestions de recherche" : "Search suggestions"} className="grid gap-2 p-4">
          <span className="sr-only" role="status">{locale === "fr" ? "Recherche dans le catalogue" : "Searching the catalog"}</span>
          {[0, 1, 2].map((item) => <span key={item} aria-hidden="true" className="h-16 animate-pulse rounded-xl bg-[var(--surface-soft)]" />)}
        </div>
      ) : hasResults ? (
        <div id={id} role="listbox" aria-label={locale === "fr" ? "Suggestions de recherche" : "Search suggestions"} className="grid max-h-[min(34rem,68vh)] overflow-y-auto lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,.65fr)]">
          {mainGroups.length ? (
            <div className="min-w-0 p-3 sm:p-4">
              {mainGroups.map((group, index) => <EntityGroup key={group.key} id={id} group={group} groups={groups} activeIndex={activeIndex} locale={locale} separated={index > 0} onActiveIndexChange={onActiveIndexChange} onSelect={onSelect} />)}
            </div>
          ) : null}
          {sideGroups.length || lyrics ? (
            <div className={cn("min-w-0 bg-[var(--surface-soft)] p-4", mainGroups.length ? "border-t border-[var(--line)] lg:border-l lg:border-t-0" : "lg:col-span-2")}>
              {sideGroups.map((group) => <SideGroup key={group.key} id={id} group={group} groups={groups} activeIndex={activeIndex} locale={locale} onActiveIndexChange={onActiveIndexChange} onSelect={onSelect} />)}
              {lyrics ? <LyricsGroup id={id} group={lyrics} groups={groups} activeIndex={activeIndex} locale={locale} onActiveIndexChange={onActiveIndexChange} onSelect={onSelect} /> : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div id={id} role="listbox" aria-label={locale === "fr" ? "Suggestions de recherche" : "Search suggestions"} className="px-5 py-8 text-center">
          <Search className="mx-auto text-[var(--text-muted)]" size={22} aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold">
            {error
              ? locale === "fr" ? "Les suggestions sont momentanément indisponibles." : "Suggestions are temporarily unavailable."
              : locale === "fr" ? `Aucun résultat pour « ${query} ».` : `No results for “${query}”.`}
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[var(--text-muted)]">
            {locale === "fr" ? "Essayez un titre, une ambiance, un instrument ou une expression différente." : "Try a title, mood, instrument or a different phrase."}
          </p>
        </div>
      )}
      {!loading && !hasResults && !error && translationLoading ? (
        <div className="flex items-center justify-center gap-2 border-t border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-xs text-[var(--text-muted)]" role="status">
          <Sparkles size={13} className="animate-pulse text-[var(--signal-strong)]" aria-hidden="true" />
          {locale === "fr" ? "Recherche d’une alternative en anglais…" : "Looking for an English alternative…"}
        </div>
      ) : null}
      {!loading && !hasResults && !error && translationSuggestion && onApplyTranslation ? (
        <div className="search-autocomplete-translation flex flex-col gap-3 border-t border-[var(--signal-strong)] bg-[var(--color-primary-light)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between" aria-live="polite">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--parigo-corner-md)_var(--parigo-turn-md)] bg-[var(--surface)] text-[var(--signal-strong)]" aria-hidden="true"><Sparkles size={16} /></span>
            <p className="min-w-0 text-sm leading-5">
              {locale === "fr" ? "Rechercher aussi" : "Also search for"}{" "}
              <strong>« {translationSuggestion.effective} »</strong>{" "}
              {locale === "fr" ? "en anglais ?" : "in English?"}
            </p>
          </div>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onApplyTranslation}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-[var(--parigo-corner-md)_var(--parigo-turn-md)] border border-[var(--signal-strong)] bg-[var(--signal-strong)] px-4 text-xs font-semibold text-[var(--signal-contrast)] transition hover:bg-[var(--foreground)] hover:text-[var(--background)]"
          >
            {locale === "fr" ? `Rechercher « ${translationSuggestion.effective} »` : `Search for “${translationSuggestion.effective}”`}
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      ) : null}
      <div className="flex flex-col gap-2 border-t border-[var(--line)] bg-[var(--background)] px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[var(--text-muted)]">
          {hasResults
            ? `↑↓ ${locale === "fr" ? "naviguer · Entrée sélectionner · Échap fermer" : "navigate · Enter select · Escape close"}`
            : locale === "fr" ? "Pistes, albums, playlists et métadonnées parcourus" : "Tracks, albums, playlists and metadata searched"}
        </span>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onViewAll} className="inline-flex min-h-9 items-center gap-2 self-start font-semibold transition hover:text-[var(--signal-strong)] sm:self-auto">
          {locale === "fr" ? `Voir tous les résultats pour « ${query} »` : `View all results for “${query}”`}
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
