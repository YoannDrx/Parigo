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
  separateMobileSearch?: boolean;
  mobileLeadingControl?: React.ReactNode;
}

function CatalogViewControl({
  locale,
  view,
  onViewChange,
  visibility,
  mobile = false,
}: {
  locale: "fr" | "en";
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  visibility: "all" | "desktop" | "hidden";
  mobile?: boolean;
}) {
  return (
    <div className={cn(
      "search-view-toggle h-12 shrink-0 items-center border border-[var(--line-strong)] bg-[var(--background)] p-1",
      mobile ? "inline-flex w-full lg:w-fit" : "w-fit",
      visibility === "desktop" ? "hidden md:inline-flex" : visibility === "hidden" ? "hidden" : "inline-flex",
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
            "grid h-10 place-items-center transition",
            mobile ? "min-w-0 flex-1 lg:w-10 lg:flex-none" : "w-10",
            view === mode ? "bg-[var(--foreground)] text-[var(--background)]" : "hover:bg-[var(--surface-soft)]",
          )}
        >
          <Icon size={18} />
        </button>
      ))}
    </div>
  );
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
  separateMobileSearch = false,
  mobileLeadingControl,
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
      {separateMobileSearch && query !== undefined && onQueryChange && queryPlaceholder ? (
        <div className="catalog-toolbar search-toolbar border-0 bg-transparent p-0 shadow-none lg:border lg:border-[var(--line-strong)] lg:bg-[var(--surface)] lg:p-2.5 lg:shadow-[7px_7px_0_color-mix(in_srgb,var(--signal)_10%,transparent)]">
          <div className="grid min-w-0 gap-2 lg:flex lg:flex-wrap lg:items-stretch">
            <div data-testid="catalog-mobile-search" className="search-toolbar border border-[var(--line-strong)] bg-[var(--surface)] p-2 lg:contents">
              <CatalogSearchField id="catalog-search" value={query} onValueChange={onQueryChange} placeholder={queryPlaceholder} ariaLabel={queryPlaceholder} clearLabel={locale === "fr" ? "Effacer la recherche" : "Clear search"} density="compact" className="w-full min-w-0 lg:flex-[1_1_24rem]" />
            </div>
            <div data-testid="catalog-mobile-controls" className="catalog-toolbar search-toolbar grid grid-cols-2 items-stretch gap-2 border border-[var(--line-strong)] bg-[var(--surface)] p-2 shadow-none lg:contents">
              {mobileLeadingControl ? <div className="col-span-2 lg:hidden">{mobileLeadingControl}</div> : null}
              {primaryControls}
              <Select
                variant="editorial"
                caption={locale === "fr" ? "Ordre" : "Order"}
                value={sort}
                onValueChange={onSortChange}
                ariaLabel={locale === "fr" ? "Trier les résultats" : "Sort results"}
                className="w-full min-w-0 lg:w-auto lg:min-w-44"
                listboxClassName="search-mobile-select-listbox--left"
                options={sortOptions}
              />
              <CatalogViewControl locale={locale} view={view} onViewChange={onViewChange} visibility={viewControlVisibility} mobile />
              <p className="col-span-2 font-mono text-[.6rem] uppercase tracking-[.11em] text-[var(--text-muted)] lg:basis-full" role="status">
                {resultCount} {locale === "fr" ? "résultats" : "results"}
              </p>
            </div>
          </div>
          {children}
        </div>
      ) : null}

      {!separateMobileSearch ? <div className="catalog-toolbar search-toolbar border border-[var(--line-strong)] bg-[var(--surface)] p-2.5">
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
          <CatalogViewControl locale={locale} view={view} onViewChange={onViewChange} visibility={viewControlVisibility} />
        </div>
        {children}
        <p className="mt-2 font-mono text-[.6rem] uppercase tracking-[.11em] text-[var(--text-muted)]" role="status">
          {resultCount} {locale === "fr" ? "résultats" : "results"}
        </p>
      </div> : null}
    </div>
  );
}
