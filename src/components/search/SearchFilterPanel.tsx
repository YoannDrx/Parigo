"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Minus, RotateCcw, Search } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import type { SearchFacetItem, SearchFilterGroup, SearchFilterItem } from "@/types";

export type FilterState = "neutral" | "include" | "exclude";

interface SearchFilterPanelProps {
  groups: SearchFilterGroup[];
  categories: string[];
  labels: string[];
  styles: string[];
  bpmRange: [number, number];
  durationRange: [number, number];
  categoryFacets: SearchFacetItem[];
  labelFacets: SearchFacetItem[];
  styleFacets: SearchFacetItem[];
  locale: "fr" | "en";
  onCategoriesChange: (values: string[]) => void;
  onLabelsChange: (values: string[]) => void;
  onStylesChange: (values: string[]) => void;
  onBpmChange: (value: [number, number]) => void;
  onDurationChange: (value: [number, number]) => void;
  onReset: () => void;
}

const labelsByKey: Record<string, { fr: string; en: string }> = {
  labels: { fr: "Labels", en: "Labels" },
  genre: { fr: "Genre", en: "Genre" },
  moods: { fr: "Ambiances", en: "Moods" },
  musicFor: { fr: "Musique pour", en: "Music for" },
  period: { fr: "Période", en: "Period" },
  instruments: { fr: "Instruments", en: "Instruments" },
  area: { fr: "Zone", en: "Area" },
  styles: { fr: "Style", en: "Style" },
};

function unsigned(value: string): string {
  return value.startsWith("-") ? value.slice(1) : value;
}

function selectedState(values: string[], id: string): FilterState {
  if (values.includes(id)) return "include";
  if (values.includes(`-${id}`)) return "exclude";
  return "neutral";
}

function nextValues(values: string[], id: string, state: Exclude<FilterState, "neutral">): string[] {
  const cleaned = values.filter((value) => unsigned(value) !== id);
  if (selectedState(values, id) === state) return cleaned;
  return [...cleaned, state === "exclude" ? `-${id}` : id].sort((a, b) => unsigned(a).localeCompare(unsigned(b)));
}

function filterTree(items: SearchFilterItem[], query: string, locale: "fr" | "en"): SearchFilterItem[] {
  const normalized = query.trim().toLocaleLowerCase(locale);
  if (!normalized) return items;
  return items.flatMap((item) => {
    const children = filterTree(item.children ?? [], query, locale);
    return item.name.toLocaleLowerCase(locale).includes(normalized) || children.length
      ? [{ ...item, children }]
      : [];
  });
}

function facetMap(items: SearchFacetItem[]): Map<string, number> {
  return new Map(items.map((item) => [item.id.replace(/^ATT_/i, ""), item.count]));
}

function flatFilterIds(items: SearchFilterItem[]): string[] {
  return items.flatMap((item) => [item.id, ...flatFilterIds(item.children ?? [])]);
}

function descendantStates(items: SearchFilterItem[], values: string[]) {
  const ids = flatFilterIds(items);
  return {
    included: ids.filter((id) => values.includes(id)).length,
    excluded: ids.filter((id) => values.includes(`-${id}`)).length,
  };
}

function FilterItemRow({
  item,
  values,
  selection,
  counts,
  locale,
  depth = 0,
  onChange,
}: {
  item: SearchFilterItem;
  values: string[];
  selection: SearchFilterGroup["selection"];
  counts: Map<string, number>;
  locale: "fr" | "en";
  depth?: number;
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(depth === 0);
  const state = selectedState(values, item.id);
  const children = item.children ?? [];
  const descendants = descendantStates(children, values);
  const descendantCount = descendants.included + descendants.excluded;
  const count = counts.get(item.id.replace(/^ATT_/i, ""));
  const name = item.name;
  return (
    <li>
      <div
        className={cn(
          "group/item flex min-h-9 items-center gap-1 rounded-md px-1.5 text-sm transition hover:bg-[var(--surface-soft)]",
          state === "include" && "bg-[color-mix(in_srgb,var(--signal)_11%,transparent)]",
          state === "exclude" && "filter-row-excluded",
        )}
        style={{ paddingLeft: `${6 + depth * 14}px` }}
      >
        {children.length ? (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="flex h-8 w-7 shrink-0 items-center justify-center rounded hover:bg-black/5"
            aria-label={`${open ? (locale === "fr" ? "Replier" : "Collapse") : (locale === "fr" ? "Déplier" : "Expand")} ${name}`}
          >
            <ChevronDown size={13} className={cn("transition", !open && "-rotate-90")} />
          </button>
        ) : <span className="w-7 shrink-0" />}
        <span className={cn("min-w-0 flex-1 truncate", state === "exclude" && "line-through decoration-[var(--danger)]/65")}>{name}</span>
        {!open && descendantCount > 0 && <span className="mr-2 flex min-w-6 items-center justify-center gap-1 rounded-full border border-[var(--line-strong)] bg-[var(--background)] px-1.5 py-0.5 font-mono text-[.52rem]" aria-label={locale === "fr" ? `${descendants.included} sous-filtres inclus et ${descendants.excluded} exclus` : `${descendants.included} included and ${descendants.excluded} excluded subfilters`}>{descendantCount}</span>}
        {count !== undefined && <span className="min-w-7 text-right font-mono text-[.6rem] opacity-45">{count}</span>}
        <button
          type="button"
          aria-pressed={state === "include"}
          onClick={() => onChange(nextValues(values, item.id, "include"))}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition",
            state === "include"
              ? "border-[var(--signal-strong)] bg-[var(--signal-strong)] text-white"
              : "border-[var(--line-strong)] text-[var(--text-muted)] hover:border-[var(--signal-strong)] hover:text-[var(--signal-strong)]",
          )}
          aria-label={`${locale === "fr" ? "Inclure" : "Include"} ${name}`}
        >
          <Check size={13} />
        </button>
        {selection === "include-exclude" && (
          <button
            type="button"
            aria-pressed={state === "exclude"}
            onClick={() => onChange(nextValues(values, item.id, "exclude"))}
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition",
              state === "exclude"
                ? "border-[var(--danger)] bg-[var(--danger)] text-white"
                : "border-[var(--line-strong)] text-[var(--text-muted)] hover:border-[var(--danger)] hover:text-[var(--danger)]",
            )}
            aria-label={`${locale === "fr" ? "Exclure" : "Exclude"} ${name}`}
          >
            <Minus size={13} />
          </button>
        )}
      </div>
      {open && children.length > 0 && (
        <ul>
          {children.map((child) => (
            <FilterItemRow
              key={child.id}
              item={child}
              values={values}
              selection={selection}
              counts={counts}
              locale={locale}
              depth={depth + 1}
              onChange={onChange}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function FilterGroupSection({
  group,
  values,
  facets,
  locale,
  onChange,
}: {
  group: SearchFilterGroup;
  values: string[];
  facets: SearchFacetItem[];
  locale: "fr" | "en";
  onChange: (values: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const visibleItems = useMemo(() => filterTree(group.items, query, locale), [group.items, locale, query]);
  const counts = useMemo(() => facetMap(facets), [facets]);
  const groupIds = useMemo(() => new Set(flatFilterIds(group.items)), [group.items]);
  const selected = values.filter((value) => groupIds.has(unsigned(value))).length;
  const available = facets.length
    ? [...groupIds].filter((id) => counts.has(id.replace(/^ATT_/i, ""))).length
    : group.available;
  return (
    <details open={group.key === "genre" || group.key === "labels" || undefined} className="group border-b border-[var(--line)] px-4 transition-colors hover:bg-[var(--surface-soft)] focus-within:bg-[var(--surface-soft)]">
      <summary className="flex min-h-14 cursor-pointer list-none items-center py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex-1 font-medium">{labelsByKey[group.key]?.[locale] ?? group.label}</span>
        <span className="ml-5 flex items-center gap-3">
          <span
            className="font-mono text-[.62rem] text-[var(--text-muted)]"
            aria-label={locale === "fr" ? `${group.total} critères au total, ${available} disponibles` : `${group.total} total filters, ${available} available`}
          >
            {group.total}/{available}
          </span>
          {selected > 0 && <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--signal-strong)] px-1.5 text-[.6rem] font-semibold text-white">{selected}</span>}
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-transparent transition group-hover:border-[var(--line)]"><ChevronDown size={15} className="transition group-open:rotate-180" /></span>
        </span>
      </summary>
      <div className="pb-5 pt-1">
        <div className="relative mb-2.5">
          <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-45" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={locale === "fr" ? `Filtrer ${labelsByKey[group.key]?.fr.toLocaleLowerCase("fr") ?? ""}` : `Filter ${labelsByKey[group.key]?.en.toLocaleLowerCase("en") ?? ""}`}
            className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] pl-9 pr-3 text-xs outline-none focus:border-[var(--signal-strong)]"
          />
        </div>
        {selected > 0 && (
          <button type="button" onClick={() => onChange(values.filter((value) => !groupIds.has(unsigned(value))))} className="mb-2 inline-flex min-h-8 items-center gap-1.5 text-[.68rem] font-semibold text-[var(--signal-strong)] hover:underline">
            <RotateCcw size={12} />{locale === "fr" ? "Réinitialiser ce groupe" : "Reset this group"}
          </button>
        )}
        <ul className="max-h-72 space-y-0.5 overflow-y-auto overscroll-contain pr-1">
          {visibleItems.map((item) => (
            <FilterItemRow key={item.id} item={item} values={values} selection={group.selection} counts={counts} locale={locale} onChange={onChange} />
          ))}
        </ul>
      </div>
    </details>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  locale,
  format,
  onChange,
}: {
  label: string;
  value: [number, number];
  min: number;
  max: number;
  locale: "fr" | "en";
  format: (value: number) => string;
  onChange: (value: [number, number]) => void;
}) {
  const start = ((value[0] - min) / (max - min)) * 100;
  const end = ((value[1] - min) / (max - min)) * 100;
  return (
    <div className="border-b border-[var(--line)] px-4 py-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-medium">{label}</p>
        <span className="font-mono text-[.66rem] text-[var(--text-muted)]">{format(value[0])} — {format(value[1])}</span>
      </div>
      <div className="pointer-events-none relative mb-4 h-7" style={{ "--range-start": `${start}%`, "--range-end": `${end}%` } as React.CSSProperties}>
        <div className="absolute left-0 right-0 top-3 h-1 rounded-full bg-[var(--line)]" />
        <div className="absolute top-3 h-1 rounded-full bg-[var(--signal-strong)]" style={{ left: `${start}%`, right: `${100 - end}%` }} />
        <input aria-label={`${label} minimum`} type="range" min={min} max={max} value={value[0]} onChange={(event) => onChange([Math.min(Number(event.target.value), value[1]), value[1]])} className="range-thumb pointer-events-none absolute inset-0 w-full appearance-none bg-transparent" />
        <input aria-label={`${label} maximum`} type="range" min={min} max={max} value={value[1]} onChange={(event) => onChange([value[0], Math.max(Number(event.target.value), value[0])])} className="range-thumb pointer-events-none absolute inset-0 w-full appearance-none bg-transparent" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[.62rem] uppercase tracking-[.1em] text-[var(--text-muted)]">Min
          <input type="number" min={min} max={value[1]} value={value[0]} onChange={(event) => onChange([Math.min(Number(event.target.value), value[1]), value[1]])} className="mt-1 h-10 w-full rounded-md border border-[var(--line)] bg-transparent px-3 font-mono text-xs" />
        </label>
        <label className="text-[.62rem] uppercase tracking-[.1em] text-[var(--text-muted)]">Max
          <input type="number" min={value[0]} max={max} value={value[1]} onChange={(event) => onChange([value[0], Math.max(Number(event.target.value), value[0])])} className="mt-1 h-10 w-full rounded-md border border-[var(--line)] bg-transparent px-3 font-mono text-xs" />
        </label>
      </div>
      <span className="sr-only">{locale === "fr" ? "Les deux curseurs définissent la plage incluse" : "The two sliders define the included range"}</span>
    </div>
  );
}

export function SearchFilterPanel(props: SearchFilterPanelProps) {
  const {
    groups,
    categories,
    labels,
    styles,
    bpmRange,
    durationRange,
    categoryFacets,
    labelFacets,
    styleFacets,
    locale,
    onCategoriesChange,
    onLabelsChange,
    onStylesChange,
    onBpmChange,
    onDurationChange,
    onReset,
  } = props;
  const activeCount = categories.length + labels.length + styles.length
    + (bpmRange[0] !== 50 || bpmRange[1] !== 200 ? 1 : 0)
    + (durationRange[0] !== 0 || durationRange[1] !== 300 ? 1 : 0);
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--background)] shadow-[var(--shadow-sm)]">
      <div className="flex min-h-16 items-center justify-between border-b border-[var(--line)] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">{locale === "fr" ? "Affiner la recherche" : "Refine search"}</h2>
          {activeCount > 0 && <p className="mt-0.5 text-[.65rem] text-[var(--text-muted)]">{activeCount} {locale === "fr" ? "critères actifs" : "active filters"}</p>}
        </div>
        {activeCount > 0 && <button type="button" onClick={onReset} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 text-[.68rem] font-semibold transition hover:border-[var(--signal-strong)] hover:text-[var(--signal-strong)]"><RotateCcw size={12} />{locale === "fr" ? "Tout effacer" : "Clear all"}</button>}
      </div>
      {groups.map((group) => (
        <FilterGroupSection
          key={group.key}
          group={group}
          values={group.key === "labels" ? labels : group.key === "styles" ? styles : categories}
          facets={group.key === "labels" ? labelFacets : group.key === "styles" ? styleFacets : categoryFacets}
          locale={locale}
          onChange={group.key === "labels" ? onLabelsChange : group.key === "styles" ? onStylesChange : onCategoriesChange}
        />
      ))}
      <RangeControl label="BPM" value={bpmRange} min={50} max={200} locale={locale} format={(value) => String(value)} onChange={onBpmChange} />
      <div className="flex gap-2 border-b border-[var(--line)] px-4 py-4">
        {([[50, 90], [90, 130], [130, 200]] as Array<[number, number]>).map((range, index) => (
          <button key={range.join("-")} type="button" onClick={() => onBpmChange(range)} className="min-h-9 flex-1 rounded-full border border-[var(--line)] px-2 text-[.65rem] font-semibold hover:border-[var(--signal-strong)]">
            {locale === "fr" ? ["Lent", "Moyen", "Rapide"][index] : ["Slow", "Medium", "Fast"][index]}
          </button>
        ))}
      </div>
      <RangeControl label={locale === "fr" ? "Durée" : "Duration"} value={durationRange} min={0} max={300} locale={locale} format={formatDuration} onChange={onDurationChange} />
    </div>
  );
}
