"use client";

import { Check, Minus, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type CatalogFilterState = "include" | "exclude";

export interface CatalogActiveFilter {
  id: string;
  label: string;
  group?: string;
  state: CatalogFilterState;
  onRemove: () => void;
}

export function CatalogActiveFilters({
  locale,
  filters,
  onReset,
}: {
  locale: "fr" | "en";
  filters: CatalogActiveFilter[];
  onReset: () => void;
}) {
  if (!filters.length) return null;
  const included = filters.filter((filter) => filter.state === "include").length;
  const excluded = filters.length - included;

  return (
    <div className="catalog-active-filters search-active-filters mt-4 border border-[var(--line-strong)] bg-[var(--background)] p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[.62rem] font-semibold uppercase tracking-[.1em]">
          {locale === "fr"
            ? `${included} inclus · ${excluded} exclus`
            : `${included} included · ${excluded} excluded`}
        </p>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex min-h-9 items-center gap-2 border border-[var(--line)] bg-[var(--surface)] px-3 text-[.68rem] font-semibold transition hover:border-[var(--signal-strong)] hover:text-[var(--signal-strong)]"
        >
          <RotateCcw size={12} />
          {locale === "fr" ? "Tout effacer" : "Clear all"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={filter.onRemove}
            className={cn(
              "search-chip inline-flex min-h-9 items-center gap-1.5 px-3 text-xs",
              filter.state === "exclude"
                ? "search-chip--excluded filter-chip-excluded"
                : "search-chip--included",
            )}
            aria-label={`${locale === "fr" ? "Retirer" : "Remove"} ${filter.label}`}
          >
            <span
              className={cn(
                "search-chip__mark flex h-4 w-4 items-center justify-center text-white",
                filter.state === "exclude" ? "bg-[var(--danger)]" : "bg-[var(--signal-strong)]",
              )}
            >
              {filter.state === "exclude" ? <Minus size={10} /> : <Check size={10} />}
            </span>
            {filter.group && <span className="font-mono text-[.52rem] uppercase tracking-[.08em] opacity-55">{filter.group}</span>}
            <span>{filter.label}</span>
            <X size={12} />
          </button>
        ))}
      </div>
    </div>
  );
}
