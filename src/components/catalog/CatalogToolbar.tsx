"use client";

import { Grid3X3, List } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { CatalogSearchField } from "@/components/search/CatalogSearchField";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/types";

interface CatalogToolbarProps<TSort extends string> {
  locale: "fr" | "en";
  query?: string;
  onQueryChange?: (value: string) => void;
  queryPlaceholder?: string;
  sort: TSort;
  onSortChange: (value: TSort) => void;
  sortOptions: Array<{ value: TSort; label: string }>;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  resultCount: number;
  primaryControls?: React.ReactNode;
  children?: React.ReactNode;
  sticky?: boolean;
  viewControlVisibility?: "all" | "desktop" | "hidden";
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
  primaryControls,
  children,
  sticky = true,
  viewControlVisibility = "all",
}: CatalogToolbarProps<TSort>) {
  return (
    <div
      data-testid="catalog-workspace"
      className={cn(
        sticky
          ? "catalog-workspace search-workspace relative z-40 mb-6 bg-[var(--background)] pb-2 pt-1 lg:sticky"
          : "mb-10",
      )}
    >
      <div className="catalog-toolbar search-toolbar border border-[var(--line-strong)] bg-[var(--surface)] p-2.5">
        <div className="flex min-w-0 flex-wrap items-stretch gap-2">
          {query !== undefined && onQueryChange && queryPlaceholder && (
            <CatalogSearchField id="catalog-search" value={query} onValueChange={onQueryChange} placeholder={queryPlaceholder} ariaLabel={queryPlaceholder} clearLabel={locale === "fr" ? "Effacer la recherche" : "Clear search"} density="compact" className="min-w-0 flex-[1_1_24rem]" />
          )}
          {primaryControls}
          <Select
            variant="editorial"
            caption={locale === "fr" ? "Ordre" : "Order"}
            value={sort}
            onValueChange={onSortChange}
            ariaLabel={locale === "fr" ? "Trier les résultats" : "Sort results"}
            className="min-w-44"
            options={sortOptions}
          />
          <div className={cn(
            "search-view-toggle h-12 w-fit shrink-0 items-center border border-[var(--line-strong)] bg-[var(--background)] p-1",
            viewControlVisibility === "desktop" ? "hidden md:inline-flex" : viewControlVisibility === "hidden" ? "hidden" : "inline-flex",
          )} role="group" aria-label={locale === "fr" ? "Mode d’affichage" : "Display mode"}>
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
                  "grid h-10 w-10 place-items-center transition",
                  view === mode ? "bg-[var(--foreground)] text-[var(--background)]" : "hover:bg-[var(--surface-soft)]",
                )}
              >
                <Icon size={18} />
              </button>
            ))}
          </div>
        </div>
        {children}
        <p className="mt-2 font-mono text-[.6rem] uppercase tracking-[.11em] text-[var(--text-muted)]" role="status">
          {resultCount} {locale === "fr" ? "résultats" : "results"}
        </p>
      </div>
    </div>
  );
}
