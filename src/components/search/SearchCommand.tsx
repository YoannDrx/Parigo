"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import { ArrowRight, Check, ChevronDown, Search, Sparkles, X } from "lucide-react";
import { SearchAutocompleteMenu } from "@/components/search/SearchAutocompleteMenu";
import { useSearchAutocomplete } from "@/hooks/use-search-autocomplete";
import { consumeSearchExpression } from "@/lib/search-normalization";
import { cn } from "@/lib/utils";
import type { AutocompleteItem, AutocompleteSearchContext, SearchMode } from "@/types";

export type SearchResultView = "tracks" | "albums";

interface SearchCommandProps {
  id: string;
  value: string;
  locale: "fr" | "en";
  variant?: "hero" | "workspace" | "compact";
  className?: string;
  inputLabel?: string;
  onValueChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onSelect: (item: AutocompleteItem, remainingQuery?: string) => void;
  onClear?: () => void;
  stagedFilters?: AutocompleteItem[];
  onRemoveStagedFilter?: (item: AutocompleteItem) => void;
  filterSelectionState?: "pending" | "applied";
  autocompleteContext?: AutocompleteSearchContext;
  autocompleteEnabled?: boolean;
  onModeChange?: (mode: SearchMode) => void;
}

export function SearchCommand({
  id,
  value,
  locale,
  variant = "workspace",
  className,
  inputLabel,
  onValueChange,
  onSubmit,
  onSelect,
  onClear,
  stagedFilters = [],
  onRemoveStagedFilter,
  filterSelectionState = "pending",
  autocompleteContext = {},
  autocompleteEnabled = true,
  onModeChange,
}: SearchCommandProps) {
  const [focused, setFocused] = useState(false);
  const [mode, setMode] = useState<SearchMode>("keyword");
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [aiDraft, setAiDraft] = useState("");
  const [filterAnnouncement, setFilterAnnouncement] = useState("");
  const [panelDismissed, setPanelDismissed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modeSelectorRef = useRef<HTMLDivElement>(null);
  const keywordMode = mode === "keyword";
  const displayedValue = keywordMode ? value : aiDraft;
  const normalizedValue = displayedValue.trim();
  const hasSearchCriteria = Boolean(normalizedValue || stagedFilters.length);
  const stagedCategories = stagedFilters.filter((item) => item.filterGroup !== "styles").map((item) => item.id);
  const stagedStyles = stagedFilters.filter((item) => item.filterGroup === "styles").map((item) => item.id);
  const resolvedAutocompleteContext: AutocompleteSearchContext = {
    ...autocompleteContext,
    categories: [...new Set([...(autocompleteContext.categories ?? []), ...stagedCategories])],
    styles: [...new Set([...(autocompleteContext.styles ?? []), ...stagedStyles])],
  };
  const autocomplete = useSearchAutocomplete(displayedValue, locale, autocompleteEnabled && focused && keywordMode, resolvedAutocompleteContext);
  const suggestionsId = `${id}-suggestions`;
  const panelOpen = autocompleteEnabled && keywordMode && focused && !panelDismissed && (
    (normalizedValue.length >= 2 && autocomplete.status !== "idle")
    || stagedFilters.length > 0
  );
  const modeMenuId = `${id}-mode-menu`;
  const animatedAiSurface = variant === "hero" || variant === "workspace";

  useEffect(() => {
    if (!modeMenuOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !modeSelectorRef.current?.contains(event.target)) setModeMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [modeMenuOpen]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!hasSearchCriteria || !keywordMode) return;
    autocomplete.close();
    inputRef.current?.blur();
    onSubmit(normalizedValue);
  };

  const selectSuggestion = (item: AutocompleteItem) => {
    if (item.kind === "filter") {
      const alreadyStaged = stagedFilters.some((candidate) => candidate.id === item.id && candidate.filterGroup === item.filterGroup);
      if (alreadyStaged && onRemoveStagedFilter) {
        onRemoveStagedFilter(item);
        setFilterAnnouncement(locale === "fr" ? `Filtre ${item.label} retiré` : `${item.label} filter removed`);
      } else {
        const remainingQuery = consumeSearchExpression(displayedValue, item.matchedTerm);
        onValueChange(remainingQuery);
        onSelect(item, remainingQuery);
        const recognizedTerm = item.matchedTerm?.trim();
        setFilterAnnouncement(recognizedTerm
          ? locale === "fr"
            ? `« ${recognizedTerm} » a été utilisé comme filtre ${item.label}`
            : `“${recognizedTerm}” was used as the ${item.label} filter`
          : locale === "fr" ? `Filtre ${item.label} ajouté` : `${item.label} filter added`);
      }
      setPanelDismissed(false);
      window.requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    autocomplete.close();
    inputRef.current?.blur();
    onSelect(item);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!autocomplete.items.length) return;
      event.preventDefault();
      autocomplete.move(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Escape") {
      setModeMenuOpen(false);
      setPanelDismissed(true);
      autocomplete.close();
      return;
    }
    if (event.key === "Enter" && autocomplete.activeItem) {
      event.preventDefault();
      selectSuggestion(autocomplete.activeItem);
    }
  };

  const clear = () => {
    if (keywordMode) {
      onValueChange("");
      onClear?.();
    } else {
      setAiDraft("");
    }
    autocomplete.close();
    setPanelDismissed(true);
    inputRef.current?.focus();
    setFilterAnnouncement("");
  };

  const preserveInputFocus = (event: MouseEvent<HTMLButtonElement>) => event.preventDefault();
  const resolvedInputLabel = keywordMode
    ? inputLabel || (locale === "fr" ? "Rechercher dans le catalogue" : "Search the catalog")
    : locale === "fr"
      ? "Décrire un brief musical assisté par IA"
      : "Describe an AI-assisted music brief";
  const switchMode = (nextMode: SearchMode) => {
    if (nextMode === "ai" && !aiDraft && value) setAiDraft(value);
    setMode(nextMode);
    onModeChange?.(nextMode);
    setModeMenuOpen(false);
    setPanelDismissed(false);
    autocomplete.close();
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <section
      data-testid={`${id}-command`}
      className={cn(
        "search-command relative overflow-visible",
        (modeMenuOpen || panelOpen) && "z-[80]",
        className,
      )}
      aria-label={locale === "fr" ? "Recherche dans le catalogue" : "Catalog search"}
    >
      <div className="search-command__row group/search relative isolate min-w-0 [--search-shell-corner:var(--parigo-corner-md)] sm:[--search-shell-corner:var(--parigo-corner-lg)]">
        {animatedAiSurface ? (
          <span
            data-testid="ai-search-glow"
            data-active={keywordMode ? "false" : "true"}
            aria-hidden="true"
            className="pointer-events-none absolute -inset-[3px] z-[59] overflow-hidden opacity-0 shadow-[0_0_30px_color-mix(in_srgb,var(--ai-search)_18%,transparent)] transition-[opacity,box-shadow] duration-500 data-[active=true]:opacity-100 group-focus-within/search:shadow-[0_0_36px_color-mix(in_srgb,var(--ai-search)_28%,transparent)] group-hover/search:shadow-[0_0_36px_color-mix(in_srgb,var(--ai-search)_28%,transparent)] motion-reduce:transition-none"
            style={{ borderRadius: "calc(var(--search-shell-corner) + 3px) calc(var(--parigo-turn-lg) + 3px)" }}
          >
            <span
              data-testid="ai-search-glow-beam"
              className={cn(
                "absolute left-1/2 top-1/2 aspect-square w-[125%] -translate-x-1/2 -translate-y-1/2 motion-reduce:animate-none motion-reduce:opacity-70",
                keywordMode ? "" : "animate-spin [animation-duration:4.8s]",
              )}
              style={{ background: "conic-gradient(from 0deg, transparent 0deg 268deg, color-mix(in srgb, var(--ai-search) 26%, white) 298deg, var(--ai-search) 326deg, transparent 360deg)" }}
            />
          </span>
        ) : null}
        <form
          onSubmit={submit}
          data-mode={mode}
          data-has-value={hasSearchCriteria ? "true" : "false"}
          className={cn(
            "search-command__form grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 border bg-[var(--surface)] p-1.5",
            keywordMode ? "search-command__form--keyword" : "search-command__form--ai before:hidden after:hidden",
            variant === "hero" ? "min-h-[4.5rem]" : "min-h-14",
          )}
          style={animatedAiSurface && !keywordMode
            ? {
                borderColor: "transparent",
                borderRadius: "var(--search-shell-corner) var(--parigo-turn-lg)",
                background: "var(--surface)",
                boxShadow: "none",
              }
            : undefined}
        >
          <div className="flex min-w-0 items-center">
            <div ref={modeSelectorRef} className="search-mode-select relative ml-1 shrink-0">
              <button
                type="button"
                className={cn("search-mode-select__trigger", keywordMode ? "text-[var(--signal-strong)]" : "text-[var(--ai-search)]")}
                aria-label={`${locale === "fr" ? "Mode de recherche" : "Search mode"} : ${keywordMode ? "Catalogue" : locale === "fr" ? "Brief IA" : "AI brief"}`}
                aria-haspopup="listbox"
                aria-expanded={modeMenuOpen}
                aria-controls={modeMenuId}
                onClick={() => setModeMenuOpen((open) => !open)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setModeMenuOpen(true);
                  }
                  if (event.key === "Escape") setModeMenuOpen(false);
                }}
              >
                <span className="search-mode-select__icon" aria-hidden="true">
                  {keywordMode ? <Search size={variant === "hero" ? 20 : 18} /> : <Sparkles size={variant === "hero" ? 21 : 19} />}
                </span>
                <ChevronDown className="search-mode-select__chevron" size={13} aria-hidden="true" />
              </button>

              {modeMenuOpen ? (
                <div id={modeMenuId} role="listbox" aria-label={locale === "fr" ? "Choisir le mode de recherche" : "Choose search mode"} className="search-mode-select__menu">
                  <button type="button" role="option" aria-selected={keywordMode} className="search-mode-select__option" onClick={() => switchMode("keyword")}>
                    <Search size={17} aria-hidden="true" />
                    <span><strong>Catalogue</strong><small>{locale === "fr" ? "Titres, filtres et métadonnées" : "Titles, filters and metadata"}</small></span>
                    {keywordMode ? <Check size={14} aria-hidden="true" /> : null}
                  </button>
                  <button type="button" role="option" aria-selected={!keywordMode} className="search-mode-select__option search-mode-select__option--ai" onClick={() => switchMode("ai")}>
                    <Sparkles size={17} aria-hidden="true" />
                    <span><strong>{locale === "fr" ? "Brief IA" : "AI brief"}</strong><small>AIMS · {locale === "fr" ? "bientôt disponible" : "coming soon"}</small></span>
                    {!keywordMode ? <Check size={14} aria-hidden="true" /> : null}
                  </button>
                </div>
              ) : null}
            </div>
            <label htmlFor={id} className="sr-only">{resolvedInputLabel}</label>
            <input
              ref={inputRef}
              id={id}
              value={displayedValue}
              onChange={(event) => {
                setFilterAnnouncement("");
                setPanelDismissed(false);
                if (keywordMode) onValueChange(event.target.value);
                else setAiDraft(event.target.value);
              }}
              onFocus={() => {
                setFocused(true);
                setPanelDismissed(false);
              }}
              onBlur={() => setFocused(false)}
              onKeyDown={handleKeyDown}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={panelOpen}
              aria-controls={suggestionsId}
              aria-activedescendant={autocomplete.activeIndex >= 0 ? `${suggestionsId}-option-${autocomplete.activeIndex}` : undefined}
              autoComplete="off"
              maxLength={500}
              placeholder={locale === "fr"
                ? keywordMode
                  ? "Titre ou mots-clés en anglais…"
                  : "Décrivez une scène, une émotion ou un usage…"
                : keywordMode
                  ? "Title or English keywords…"
                  : "Describe a scene, emotion or use…"}
              className={cn(
                "ai-search-input min-w-0 flex-1 bg-transparent px-2.5 text-[var(--foreground)] outline-none placeholder:text-current/42 sm:px-3",
                variant === "hero" ? "h-14 text-sm sm:text-base md:h-16 md:text-lg" : "h-11 text-sm sm:text-base",
              )}
            />
            {displayedValue ? (
              <button
                type="button"
                onMouseDown={preserveInputFocus}
                onClick={clear}
                className="search-command__clear flex h-10 w-10 shrink-0 items-center justify-center text-[var(--text-muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
                aria-label={locale === "fr" ? "Effacer la recherche" : "Clear search"}
              >
                <X size={16} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={!hasSearchCriteria || !keywordMode}
            className={cn(
              "search-command__submit inline-flex min-w-11 items-center justify-center text-sm font-semibold transition disabled:cursor-not-allowed",
              variant === "hero" ? "min-h-12 min-w-12 md:min-h-14 md:min-w-14" : "min-h-11 min-w-11",
            )}
            aria-label={keywordMode
              ? locale === "fr" ? "Rechercher" : "Search"
              : locale === "fr" ? "Recherche AIMS bientôt disponible" : "AIMS search coming soon"}
          >
            <ArrowRight size={19} aria-hidden="true" />
          </button>
        </form>
      </div>

      <p className="sr-only" aria-live="polite">{filterAnnouncement}</p>

      {panelOpen ? (
        <SearchAutocompleteMenu
          id={suggestionsId}
          groups={autocomplete.groups}
          activeIndex={autocomplete.activeIndex}
          loading={autocomplete.loading}
          error={autocomplete.status === "error"}
          locale={locale}
          query={normalizedValue}
          onActiveIndexChange={autocomplete.setActiveIndex}
          onSelect={selectSuggestion}
          onViewAll={() => submit()}
          stagedFilters={stagedFilters}
          onRemoveStagedFilter={onRemoveStagedFilter}
          filterSelectionState={filterSelectionState}
        />
      ) : null}
    </section>
  );
}
