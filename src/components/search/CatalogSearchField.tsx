"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CatalogSearchFieldProps {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  ariaLabel?: string;
  clearLabel?: string;
  density?: "hero" | "standard" | "compact";
  className?: string;
}

export function CatalogSearchField({
  id,
  value,
  onValueChange,
  placeholder,
  ariaLabel = placeholder,
  clearLabel = "Effacer la recherche",
  density = "standard",
  className,
}: CatalogSearchFieldProps) {
  return (
    <div className={cn("search-command relative min-w-0 overflow-visible", className)}>
      <div className="search-command__row group/search relative isolate min-w-0 [--search-shell-corner:var(--parigo-corner-md)] sm:[--search-shell-corner:var(--parigo-corner-lg)]">
        <div
          data-mode="keyword"
          data-has-value={value ? "true" : "false"}
          className={cn(
            "search-command__form search-command__form--keyword flex min-w-0 items-center gap-1.5 border bg-[var(--surface)] p-1.5",
            density === "hero" ? "min-h-[4.5rem]" : density === "compact" ? "min-h-12" : "min-h-14",
          )}
        >
          <span className="search-mode-select__trigger pointer-events-none ml-1 shrink-0 text-[var(--signal-strong)]" aria-hidden="true">
            <span className="search-mode-select__icon"><Search size={density === "hero" ? 20 : 18} /></span>
          </span>
          <label htmlFor={id} className="sr-only">{ariaLabel}</label>
          <input
            id={id}
            type="text"
            inputMode="search"
            autoComplete="off"
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder={placeholder}
            className={cn(
              "ai-search-input min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap bg-transparent px-2.5 text-[var(--foreground)] outline-none placeholder:text-[var(--text-muted)] sm:px-3",
              density === "hero" ? "h-14 text-sm sm:text-base md:h-16 md:text-lg" : density === "compact" ? "h-10 text-sm" : "h-11 text-sm sm:text-base",
            )}
          />
          {value ? (
            <button
              type="button"
              onClick={() => onValueChange("")}
              className="search-command__clear flex h-11 w-11 shrink-0 items-center justify-center text-[var(--text-muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
              aria-label={clearLabel}
            >
              <X size={16} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
