"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Minus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import type { CatalogFilterState } from "./CatalogActiveFilters";

export interface CatalogFacetOption {
  value: string;
  label: string;
  count?: number;
}

function unsigned(value: string) {
  return value.startsWith("-") ? value.slice(1) : value;
}

export function catalogFacetState(values: string[], value: string): CatalogFilterState | "neutral" {
  if (values.includes(value)) return "include";
  if (values.includes(`-${value}`)) return "exclude";
  return "neutral";
}

export function updateCatalogFacet(
  values: string[],
  value: string,
  nextState: CatalogFilterState,
) {
  const cleaned = values.filter((item) => unsigned(item) !== value);
  if (catalogFacetState(values, value) === nextState) return cleaned;
  return [...cleaned, nextState === "exclude" ? `-${value}` : value];
}

export function CatalogFacetDropdown({
  label,
  options,
  values,
  locale,
  onValuesChange,
}: {
  label: string;
  options: CatalogFacetOption[];
  values: string[];
  locale: "fr" | "en";
  onValuesChange: (values: string[]) => void;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [query, setQuery] = useState("");
  useBodyScrollLock(open && isMobile);

  const closeAndRestore = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const visibleOptions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return normalized
      ? options.filter((option) => option.label.toLocaleLowerCase(locale).includes(normalized))
      : options;
  }, [locale, options, query]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (isMobile) return;
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAndRestore();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(panelRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled])") ?? [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeAndRestore, isMobile, open]);

  const panel = (
    <div
      ref={panelRef}
      id={`${id}-panel`}
      role="dialog"
      aria-modal={isMobile || undefined}
      aria-label={locale === "fr" ? `Filtre ${label}` : `${label} filter`}
      className={cn(
        "catalog-facet__panel border border-[var(--line-strong)] bg-[var(--surface)] p-2 shadow-[0_24px_70px_rgba(15,22,16,.2)]",
        isMobile ? "fixed inset-x-3 bottom-3 z-[126] flex max-h-[min(78dvh,38rem)] flex-col overflow-hidden pb-[max(.5rem,env(safe-area-inset-bottom))]" : "absolute left-0 top-[calc(100%+.5rem)] z-[75] w-[min(22rem,calc(100vw-2rem))]",
      )}
    >
      {isMobile ? (
        <div className="mb-2 flex items-center justify-between gap-4 border-b border-[var(--line)] px-1 pb-2">
          <div>
            <p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Affiner" : "Refine"}</p>
            <p className="mt-1 text-sm font-semibold">{label}</p>
          </div>
          <button type="button" onClick={closeAndRestore} className="grid h-11 w-11 shrink-0 place-items-center border border-[var(--line)]" aria-label={locale === "fr" ? `Fermer le filtre ${label}` : `Close ${label} filter`}><X size={17} /></button>
        </div>
      ) : null}
      <div className="search-filter-field relative mb-2 shrink-0">
        <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-45" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={locale === "fr" ? `Filtrer ${label.toLocaleLowerCase("fr")}` : `Filter ${label.toLocaleLowerCase("en")}`}
          aria-label={locale === "fr" ? `Filtrer les options ${label}` : `Filter ${label} options`}
          className="h-11 w-full border border-[var(--line)] bg-[var(--background)] pl-9 pr-3 text-xs outline-none focus:border-[var(--signal-strong)]"
        />
      </div>
      <div className="mb-2 flex shrink-0 items-center justify-between px-1 font-mono text-[.52rem] uppercase tracking-[.09em] text-[var(--text-muted)]">
        <span>{locale === "fr" ? "Critère" : "Criterion"}</span>
        <span>{locale === "fr" ? "Inclure · Exclure" : "Include · Exclude"}</span>
      </div>
      <ul className="min-h-0 max-h-64 flex-1 space-y-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        {visibleOptions.map((option) => {
          const state = catalogFacetState(values, option.value);
          return (
            <li key={option.value} data-state={state} className={cn("search-filter-item flex min-h-11 items-center gap-2 px-2", state === "exclude" && "filter-row-excluded")}>
              <span className={cn("min-w-0 flex-1 truncate text-sm", state === "exclude" && "line-through decoration-[var(--danger)]/65")}>{option.label}</span>
              {option.count !== undefined && <span className="font-mono text-[.58rem] text-[var(--text-muted)]">{option.count}</span>}
              <button type="button" aria-pressed={state === "include"} onClick={() => onValuesChange(updateCatalogFacet(values, option.value, "include"))} className={cn("search-filter-action grid h-11 w-11 shrink-0 place-items-center border transition", state === "include" ? "border-[var(--signal-strong)] bg-[var(--signal-strong)] text-white" : "border-[var(--line)] hover:border-[var(--signal-strong)] hover:text-[var(--signal-strong)]")} aria-label={`${locale === "fr" ? "Inclure" : "Include"} ${option.label}`}><Check size={13} /></button>
              <button type="button" aria-pressed={state === "exclude"} onClick={() => onValuesChange(updateCatalogFacet(values, option.value, "exclude"))} className={cn("search-filter-action grid h-11 w-11 shrink-0 place-items-center border transition", state === "exclude" ? "border-[var(--danger)] bg-[var(--danger)] text-white" : "border-[var(--line)] hover:border-[var(--danger)] hover:text-[var(--danger)]")} aria-label={`${locale === "fr" ? "Exclure" : "Exclude"} ${option.label}`}><Minus size={13} /></button>
            </li>
          );
        })}
      </ul>
      {!visibleOptions.length && <p className="px-3 py-8 text-center text-xs text-[var(--text-muted)]">{locale === "fr" ? "Aucun critère trouvé." : "No criterion found."}</p>}
    </div>
  );

  return (
    <div ref={rootRef} className="catalog-facet relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
        className="catalog-facet__trigger flex min-h-12 w-full items-center justify-between gap-3 border border-[var(--line)] bg-[var(--background)] px-3.5 text-left transition hover:border-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/35"
      >
        <span className="min-w-0">
          <span className="block font-mono text-[.5rem] font-semibold uppercase tracking-[.13em] text-[var(--signal-strong)]">
            {label}
          </span>
          <span className="mt-1 block truncate text-xs font-semibold">
            {values.length
              ? (locale === "fr" ? `${values.length} critère${values.length > 1 ? "s" : ""}` : `${values.length} selected`)
              : (locale === "fr" ? "Tous" : "All")}
          </span>
        </span>
        <span className="flex items-center gap-2">
          {values.length > 0 && <span className="grid h-6 min-w-6 place-items-center bg-[var(--signal-strong)] px-1 font-mono text-[.58rem] font-semibold text-white">{values.length}</span>}
          <ChevronDown size={15} className={cn("transition duration-300", open && "rotate-180 text-[var(--signal-strong)]")} />
        </span>
      </button>

      {open && (isMobile && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 z-[125]">
          <button type="button" className="catalog-facet__mobile-backdrop absolute inset-0 bg-black/50 backdrop-blur-[10px]" onClick={closeAndRestore} aria-label={locale === "fr" ? `Fermer le filtre ${label}` : `Close ${label} filter`} />
          {panel}
        </div>,
        document.body,
      ) : panel)}
    </div>
  );
}
