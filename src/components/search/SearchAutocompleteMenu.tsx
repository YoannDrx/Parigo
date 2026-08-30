"use client";

import Image from "next/image";
import {
  ArrowRight,
  Check,
  Disc3,
  Library,
  ListMusic,
  Music2,
  Quote,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";
import type { AutocompleteGroup, AutocompleteItem } from "@/types";
import { autocompleteItemIndex } from "@/hooks/use-search-autocomplete";
import { resizeArtworkSource } from "@/lib/image-loader";
import { cn } from "@/lib/utils";

const groupLabels = {
  filters: { fr: "Filtres trouvés", en: "Matching filters" },
  titles: { fr: "Dans les titres", en: "In titles" },
  tracks: { fr: "Pistes", en: "Tracks" },
  albums: { fr: "Albums", en: "Albums" },
  playlists: { fr: "Playlists", en: "Playlists" },
  labels: { fr: "Labels", en: "Labels" },
  composers: { fr: "Compositeurs", en: "Composers" },
  words: { fr: "Affiner avec", en: "Refine with" },
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
  onActiveIndexChange: (index: number) => void;
  onSelect: (item: AutocompleteItem) => void;
  stagedFilters?: AutocompleteItem[];
  onRemoveStagedFilter?: (item: AutocompleteItem) => void;
  filterSelectionState?: "pending" | "applied";
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
  const sections = group.key === "titles"
    ? ([
        { key: "track", label: locale === "fr" ? "Pistes" : "Tracks" },
        { key: "album", label: "Albums" },
        { key: "playlist", label: "Playlists" },
      ] as const).flatMap((section) => {
        const items = group.items.filter((item) => item.kind === section.key);
        return items.length ? [{ ...section, items }] : [];
      })
    : [{ key: group.key, label: "", items: group.items }];
  return (
    <section role="group" aria-labelledby={`${id}-${group.key}`} className={cn(separated && "mt-4 border-t border-[var(--line)] pt-4")}>
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <h3 id={`${id}-${group.key}`} className="flex items-center gap-2 text-sm font-semibold">
          {group.key === "titles" ? <Search size={15} aria-hidden="true" /> : group.key === "playlists" ? <ListMusic size={15} aria-hidden="true" /> : group.key === "albums" ? <Library size={15} aria-hidden="true" /> : <Disc3 size={15} aria-hidden="true" />}
          {groupLabels[group.key][locale]}
        </h3>
        <span className="font-mono text-[.62rem] uppercase tracking-[.08em] text-[var(--text-muted)]">
          {group.items.length < group.count ? `${group.items.length}/${group.count}` : group.items.length} {locale === "fr" ? "suggestion" : "suggestion"}{group.count > 1 ? "s" : ""}
        </span>
      </div>
      <div className={cn("grid", group.key === "titles" ? "gap-5" : "gap-1")}>
        {sections.map((section) => (
          <div key={section.key} role={group.key === "titles" ? "group" : undefined} aria-labelledby={group.key === "titles" ? `${id}-${group.key}-${section.key}` : undefined}>
            {group.key === "titles" ? (
              <div className="sticky top-0 z-10 mb-1.5 flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-1 py-2">
                <h4 id={`${id}-${group.key}-${section.key}`} className="font-mono text-[.6rem] font-semibold uppercase tracking-[.11em] text-[var(--text-muted)]">{section.label}</h4>
                <span className="font-mono text-[.58rem] text-[var(--text-muted)]">{section.items.length}</span>
              </div>
            ) : null}
            <div className="grid gap-1">
              {section.items.map((item) => {
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
                      "group/suggestion grid min-h-16 w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl p-2 text-left transition",
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
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FilterGroup({
  id,
  group,
  groups,
  activeIndex,
  locale,
  onActiveIndexChange,
  onSelect,
  stagedFilters = [],
  onRemoveStagedFilter,
}: {
  id: string;
  group: AutocompleteGroup;
  groups: AutocompleteGroup[];
  activeIndex: number;
  locale: "fr" | "en";
  onActiveIndexChange: (index: number) => void;
  onSelect: (item: AutocompleteItem) => void;
  stagedFilters?: AutocompleteItem[];
  onRemoveStagedFilter?: (item: AutocompleteItem) => void;
}) {
  return (
    <section role="group" aria-labelledby={`${id}-filters`} className="border-b border-[var(--line)] bg-[var(--color-primary-light)] p-3 sm:p-4 lg:col-span-2">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h3 id={`${id}-filters`} className="flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal size={15} aria-hidden="true" />{groupLabels.filters[locale]}</h3>
          <p className="mt-1 text-[.68rem] leading-4 text-[var(--text-muted)]">{locale === "fr" ? "Ces filtres sont proposés, jamais appliqués automatiquement." : "These filters are suggested, never applied automatically."}</p>
        </div>
        <span className="shrink-0 font-mono text-[.62rem] text-[var(--text-muted)]">{group.items.length}</span>
      </div>
      <div className="grid gap-1 sm:grid-cols-2">
        {group.items.map((item) => {
          const index = autocompleteItemIndex(groups, item);
          const selected = stagedFilters.some((candidate) => candidate.id === item.id && candidate.filterGroup === item.filterGroup);
          return (
            <button
              key={`${item.kind}-${item.filterGroup}-${item.id}`}
              id={`${id}-option-${index}`}
              type="button"
              role="option"
              aria-selected={selected || index === activeIndex}
              onMouseEnter={() => onActiveIndexChange(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selected && onRemoveStagedFilter ? onRemoveStagedFilter(item) : onSelect(item)}
              className={cn(
                "flex min-h-12 items-center justify-between gap-3 border px-3 py-2 text-left transition",
                selected
                  ? "border-[var(--signal-strong)] bg-[var(--surface)] text-[var(--signal-strong)]"
                  : index === activeIndex
                  ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                  : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--signal-strong)]",
              )}
            >
              <span className="min-w-0"><span className="block whitespace-normal break-words text-sm font-semibold leading-5">{item.label}</span><span className="mt-0.5 block text-[.62rem] opacity-60">{item.subtitle}</span></span>
              <span className="shrink-0" aria-hidden="true">{selected ? <Check size={15} /> : "+"}</span>
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
                    : [item.subtitle, locale === "fr" ? "Filtrer par label" : "Filter by label"].filter(Boolean).join(" · ")}
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
  onActiveIndexChange,
  onSelect,
  onViewAll,
  stagedFilters = [],
  onRemoveStagedFilter,
  filterSelectionState = "pending",
}: SearchAutocompleteMenuProps) {
  const titleGroup = groups.find((candidate) => candidate.key === "titles");
  const mainGroupKeys = ["tracks", "albums", "playlists"];
  const mainGroups = mainGroupKeys.flatMap((key) => {
    const group = groups.find((candidate) => candidate.key === key);
    return group ? [group] : [];
  });
  const sideGroups = ["words", "composers", "labels"].flatMap((key) => {
    const group = groups.find((candidate) => candidate.key === key);
    return group ? [group] : [];
  });
  const lyrics = groups.find((group) => group.key === "lyrics");
  const filters = groups.find((group) => group.key === "filters");
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
        <div id={id} role="listbox" aria-label={locale === "fr" ? "Suggestions de recherche" : "Search suggestions"} className="max-h-[min(34rem,68vh)] overflow-y-auto">
          {titleGroup ? (
            <div className="min-w-0 p-3 sm:p-4">
              <EntityGroup id={id} group={titleGroup} groups={groups} activeIndex={activeIndex} locale={locale} separated={false} onActiveIndexChange={onActiveIndexChange} onSelect={onSelect} />
            </div>
          ) : null}
          {filters ? <FilterGroup id={id} group={filters} groups={groups} activeIndex={activeIndex} locale={locale} onActiveIndexChange={onActiveIndexChange} onSelect={onSelect} stagedFilters={stagedFilters} onRemoveStagedFilter={onRemoveStagedFilter} /> : null}
          {mainGroups.length ? (
            <div className="min-w-0 border-t border-[var(--line)] p-3 sm:p-4">
              {mainGroups.map((group, index) => <EntityGroup key={group.key} id={id} group={group} groups={groups} activeIndex={activeIndex} locale={locale} separated={index > 0} onActiveIndexChange={onActiveIndexChange} onSelect={onSelect} />)}
            </div>
          ) : null}
          {sideGroups.length || lyrics ? (
            <div className="min-w-0 border-t border-[var(--line)] bg-[var(--surface-soft)] p-4">
              {sideGroups.map((group) => <SideGroup key={group.key} id={id} group={group} groups={groups} activeIndex={activeIndex} locale={locale} onActiveIndexChange={onActiveIndexChange} onSelect={onSelect} />)}
              {lyrics ? <LyricsGroup id={id} group={lyrics} groups={groups} activeIndex={activeIndex} locale={locale} onActiveIndexChange={onActiveIndexChange} onSelect={onSelect} /> : null}
            </div>
          ) : null}
        </div>
      ) : query.length >= 2 || stagedFilters.length === 0 ? (
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
      ) : <div id={id} role="listbox" aria-label={locale === "fr" ? "Suggestions de recherche" : "Search suggestions"} />}
      {stagedFilters.length > 0 ? (
        <div className="border-t border-[var(--line)] bg-[var(--color-primary-light)] px-4 py-3" aria-live="polite">
          <p className="text-[.68rem] font-semibold">{filterSelectionState === "applied"
            ? locale === "fr" ? "Filtres appliqués" : "Applied filters"
            : locale === "fr" ? "Filtres à appliquer au lancement" : "Filters to apply when searching"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {stagedFilters.map((item) => (
              <button key={`${item.filterGroup}-${item.id}`} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onRemoveStagedFilter?.(item)} className="inline-flex min-h-8 items-center gap-1.5 border border-[var(--signal-strong)] bg-[var(--surface)] px-2.5 text-xs font-semibold text-[var(--signal-strong)]">
                {item.label}<X size={12} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex flex-col gap-2 border-t border-[var(--line)] bg-[var(--background)] px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[var(--text-muted)]">
          {hasResults
            ? `↑↓ ${locale === "fr" ? "naviguer · Entrée sélectionner · Échap fermer" : "navigate · Enter select · Escape close"}`
            : stagedFilters.length > 0
              ? locale === "fr" ? "Recherche prête avec les filtres sélectionnés" : "Search ready with selected filters"
              : locale === "fr" ? "Pistes, albums, playlists, paroles et métadonnées parcourus" : "Tracks, albums, playlists, lyrics and metadata searched"}
        </span>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onViewAll} className="inline-flex min-h-9 items-center gap-2 self-start font-semibold transition hover:text-[var(--signal-strong)] sm:self-auto">
          {stagedFilters.length > 0 && filterSelectionState === "pending"
            ? locale === "fr" ? `Voir les résultats · ${stagedFilters.length} filtre${stagedFilters.length > 1 ? "s" : ""}` : `View results · ${stagedFilters.length} filter${stagedFilters.length > 1 ? "s" : ""}`
            : query
              ? locale === "fr" ? `Voir tous les résultats pour « ${query} »` : `View all results for “${query}”`
              : locale === "fr" ? "Voir les résultats filtrés" : "View filtered results"}
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
