"use client";

import { Grid3X3, List, Search, X } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/types";

interface CatalogToolbarProps<TSort extends string> {
  locale: "fr" | "en";
  query: string;
  onQueryChange: (value: string) => void;
  queryPlaceholder: string;
  sort: TSort;
  onSortChange: (value: TSort) => void;
  sortOptions: Array<{ value: TSort; label: string }>;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  resultCount: number;
  children?: React.ReactNode;
}

export function CatalogToolbar<TSort extends string>({
  locale,
  query,
  onQueryChange,
  queryPlaceholder,
  sort,
  onSortChange,
  sortOptions,
  view,
  onViewChange,
  resultCount,
  children,
}: CatalogToolbarProps<TSort>) {
  return (
    <div className="mb-10 border border-[var(--line-strong)] bg-[var(--surface)] p-3 sm:p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_auto_auto] lg:items-center">
        <label className="relative flex min-h-12 items-center border border-[var(--line)] bg-[var(--background)]">
          <Search aria-hidden="true" size={17} className="ml-4 shrink-0 text-[var(--text-muted)]" />
          <span className="sr-only">{queryPlaceholder}</span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="h-12 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--signal-strong)]"
            placeholder={queryPlaceholder}
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              className="mr-1 grid h-11 w-11 shrink-0 place-items-center text-[var(--text-muted)] hover:text-[var(--foreground)]"
              aria-label={locale === "fr" ? "Effacer la recherche" : "Clear search"}
            >
              <X size={16} />
            </button>
          )}
        </label>
        <Select
          value={sort}
          onValueChange={onSortChange}
          ariaLabel={locale === "fr" ? "Trier les résultats" : "Sort results"}
          className="min-w-44"
          options={sortOptions}
        />
        <div className="inline-flex w-fit border border-[var(--line)]" role="group" aria-label={locale === "fr" ? "Mode d’affichage" : "Display mode"}>
          {([
            ["grid", Grid3X3, locale === "fr" ? "Vue grille" : "Grid view"],
            ["list", List, locale === "fr" ? "Vue liste" : "List view"],
          ] as const).map(([mode, Icon, label]) => (
            <button
              key={mode}
              type="button"
              aria-label={label}
              aria-pressed={view === mode}
              onClick={() => onViewChange(mode)}
              className={cn(
                "grid h-12 w-12 place-items-center transition",
                mode === "list" && "border-l border-[var(--line)]",
                view === mode ? "bg-[var(--foreground)] text-[var(--background)]" : "hover:bg-[var(--surface-soft)]",
              )}
            >
              <Icon size={18} />
            </button>
          ))}
        </div>
      </div>
      {children}
      <p className="mt-3 font-mono text-[.6rem] uppercase tracking-[.11em] text-[var(--text-muted)]" role="status">
        {resultCount} {locale === "fr" ? "résultats" : "results"}
      </p>
    </div>
  );
}
