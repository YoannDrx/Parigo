"use client";

import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { ArrowRight, Check, ChevronDown, Search, Sparkles, X } from "lucide-react";
import { SearchAutocompleteMenu } from "@/components/search/SearchAutocompleteMenu";
import { useSearchAutocomplete } from "@/hooks/use-search-autocomplete";
import { cn } from "@/lib/utils";
import type { AutocompleteItem, AutocompleteSearchContext, SearchMode, SimilaritySearchSource } from "@/types";

export type SearchResultView = "tracks" | "albums";

const RecentSearchesController = lazy(() => import("@/components/search/RecentSearchesController").then((module) => ({ default: module.RecentSearchesController })));

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
  mode?: SearchMode;
  aiValue?: string;
  onAiValueChange?: (value: string) => void;
  onAiSubmit?: (value: string) => void;
  aiEnabled?: boolean;
  aiSubmitEnabled?: boolean;
  aiSource?: SimilaritySearchSource;
  aiPlaceholder?: string;
  aiInputLabel?: string;
  aiInputType?: "text" | "url";
  aiSubmitLabel?: string;
  aiHasCriteria?: boolean;
  aiCustomContent?: ReactNode;
  aiLeadingContent?: ReactNode;
  aiRecentEnabled?: boolean;
  onAiFilesDrop?: (files: File[]) => void;
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
  mode: controlledMode,
  aiValue,
  onAiValueChange,
  onAiSubmit,
  aiEnabled = false,
  aiSubmitEnabled = aiEnabled,
  aiSource = "prompt",
  aiPlaceholder,
  aiInputLabel,
  aiInputType = "text",
  aiSubmitLabel,
  aiHasCriteria,
  aiCustomContent,
  aiLeadingContent,
  aiRecentEnabled = true,
  onAiFilesDrop,
}: SearchCommandProps) {
  const [focused, setFocused] = useState(false);
  const [internalMode, setInternalMode] = useState<SearchMode>("keyword");
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [modeMenuPlacement, setModeMenuPlacement] = useState<"top" | "bottom">("bottom");
  const [compactViewport, setCompactViewport] = useState(false);
  const [aiDraft, setAiDraft] = useState("");
  const [filterAnnouncement, setFilterAnnouncement] = useState("");
  const [panelDismissed, setPanelDismissed] = useState(false);
  const [aiDragActive, setAiDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const commandRef = useRef<HTMLElement>(null);
  const modeSelectorRef = useRef<HTMLDivElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const mode = controlledMode ?? internalMode;
  const keywordMode = mode === "keyword";
  const displayedValue = keywordMode ? value : aiValue ?? aiDraft;
  const normalizedValue = displayedValue.trim();
  const hasSearchCriteria = keywordMode ? Boolean(normalizedValue || stagedFilters.length) : aiHasCriteria ?? Boolean(normalizedValue);
  const stagedCategories = stagedFilters.filter((item) => item.filterGroup !== "styles").map((item) => item.id);
  const stagedStyles = stagedFilters.filter((item) => item.filterGroup === "styles").map((item) => item.id);
  const resolvedAutocompleteContext: AutocompleteSearchContext = {
    ...autocompleteContext,
    categories: [...new Set([...(autocompleteContext.categories ?? []), ...stagedCategories])],
    styles: [...new Set([...(autocompleteContext.styles ?? []), ...stagedStyles])],
  };
  const autocomplete = useSearchAutocomplete(displayedValue, locale, autocompleteEnabled && focused && keywordMode, resolvedAutocompleteContext);
  const suggestionsId = `${id}-suggestions`;
  const historyId = `${id}-history`;
  const historyOpen = focused && !panelDismissed && !modeMenuOpen && normalizedValue.length === 0 && stagedFilters.length === 0 && (keywordMode || aiRecentEnabled);
  const panelOpen = !modeMenuOpen && autocompleteEnabled && keywordMode && focused && !panelDismissed && (
    (normalizedValue.length >= 2 && autocomplete.status !== "idle")
    || stagedFilters.length > 0
  );
  const modeMenuId = `${id}-mode-menu`;
  const animatedAiSurface = variant === "hero" || variant === "workspace";

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setCompactViewport(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const resolveMenuPlacement = useCallback((menuHeight = 140) => {
    const rect = modeSelectorRef.current?.getBoundingClientRect();
    if (!rect) return "bottom" as const;
    // On compact screens the hero selector sits in the lower half of the
    // viewport, while the workspace selector sits directly below the fixed
    // header. Keep the hero menu above its trigger without placing the Search
    // menu underneath the header.
    if (window.matchMedia("(max-width: 639px)").matches) {
      return variant === "hero" ? "top" as const : "bottom" as const;
    }
    const safeEdge = 8;
    const spaceBelow = window.innerHeight - rect.bottom - safeEdge;
    const spaceAbove = rect.top - safeEdge;
    return spaceBelow < menuHeight && spaceAbove > spaceBelow ? "top" as const : "bottom" as const;
  }, [variant]);

  useLayoutEffect(() => {
    if (!modeMenuOpen) return;
    const menuHeight = modeMenuRef.current?.getBoundingClientRect().height ?? 140;
    setModeMenuPlacement(resolveMenuPlacement(menuHeight));
  }, [modeMenuOpen, resolveMenuPlacement]);

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
    if (!hasSearchCriteria || (!keywordMode && !aiSubmitEnabled)) return;
    autocomplete.close();
    inputRef.current?.blur();
    if (keywordMode) onSubmit(normalizedValue);
    else (onAiSubmit ?? onSubmit)(normalizedValue);
    if (normalizedValue) void import("@/components/search/RecentSearchesController").then(({ recordRecentSearch }) => recordRecentSearch(mode, normalizedValue));
  };

  const selectRecentQuery = (query: string) => {
    setPanelDismissed(true);
    autocomplete.close();
    if (keywordMode) {
      onValueChange(query);
      inputRef.current?.blur();
      onSubmit(query);
    } else {
      if (onAiValueChange) onAiValueChange(query);
      else setAiDraft(query);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const selectSuggestion = (item: AutocompleteItem) => {
    if (item.kind === "filter") {
      const alreadyStaged = stagedFilters.some((candidate) => candidate.id === item.id && candidate.filterGroup === item.filterGroup);
      if (alreadyStaged && onRemoveStagedFilter) {
        onRemoveStagedFilter(item);
        setFilterAnnouncement(locale === "fr" ? `Filtre ${item.label} retiré` : `${item.label} filter removed`);
      } else {
        onSelect(item, displayedValue);
        setFilterAnnouncement(locale === "fr" ? `Filtre ${item.label} ajouté` : `${item.label} filter added`);
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
      if (onAiValueChange) onAiValueChange("");
      else setAiDraft("");
    }
    autocomplete.close();
    setPanelDismissed(true);
    inputRef.current?.focus();
    setFilterAnnouncement("");
  };

  const preserveInputFocus = (event: MouseEvent<HTMLButtonElement>) => event.preventDefault();
  const resolvedInputLabel = keywordMode
    ? inputLabel || (locale === "fr" ? "Rechercher dans le catalogue" : "Search the catalog")
    : aiInputLabel || (locale === "fr" ? "Recherche par similarité IA" : "AI similarity search");
  const switchMode = (nextMode: SearchMode) => {
    if (nextMode === "ai" && !aiEnabled) return;
    setInternalMode(nextMode);
    onModeChange?.(nextMode);
    setModeMenuOpen(false);
    setFocused(false);
    setPanelDismissed(true);
    autocomplete.close();
    inputRef.current?.blur();
  };
  const toggleModeMenu = () => {
    setModeMenuOpen((open) => {
      if (!open) setModeMenuPlacement(resolveMenuPlacement());
      return !open;
    });
  };
  const defaultPlaceholder = compactViewport
    ? locale === "fr"
      ? keywordMode ? "Titre ou mots-clés…" : "Décrivez une scène…"
      : keywordMode ? "Title or keywords…" : "Describe a scene…"
    : locale === "fr"
      ? keywordMode ? "Titre ou mots-clés en anglais…" : "Décrivez une scène, une émotion ou un usage…"
      : keywordMode ? "Title or English keywords…" : "Describe a scene, emotion or use…";
  const placeholder = !keywordMode && aiPlaceholder ? aiPlaceholder : defaultPlaceholder;

  return (
    <section
      ref={commandRef}
      data-testid={`${id}-command`}
      className={cn(
        "search-command relative overflow-visible",
        (modeMenuOpen || panelOpen || historyOpen) && "z-[80]",
        className,
      )}
      aria-label={keywordMode ? (locale === "fr" ? "Recherche dans le catalogue" : "Catalog search") : (locale === "fr" ? "Recherche par similarité IA" : "AI similarity search")}
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
          onDragEnter={!keywordMode && onAiFilesDrop ? (event) => { if (!event.dataTransfer.types.includes("Files")) return; event.preventDefault(); setAiDragActive(true); } : undefined}
          onDragOver={!keywordMode && onAiFilesDrop ? (event) => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); } : undefined}
          onDragLeave={!keywordMode && onAiFilesDrop ? (event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setAiDragActive(false); } : undefined}
          onDrop={!keywordMode && onAiFilesDrop ? (event) => { event.preventDefault(); setAiDragActive(false); onAiFilesDrop(Array.from(event.dataTransfer.files)); } : undefined}
          data-mode={mode}
          data-source={keywordMode ? "catalog" : aiSource}
          data-variant={variant}
          data-drag-active={aiDragActive ? "true" : "false"}
          data-has-value={hasSearchCriteria ? "true" : "false"}
          className={cn(
            "search-command__form grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 border bg-[var(--surface)] p-1.5 motion-reduce:transition-none",
            variant === "hero" ? "h-[4.5rem]" : "h-14",
            keywordMode ? "search-command__form--keyword" : "search-command__form--ai before:hidden after:hidden",
            !keywordMode && variant === "workspace" && "max-sm:h-[6.75rem] max-sm:grid-cols-[minmax(0,1fr)]",
            !keywordMode && variant === "hero" && "max-sm:h-[8.25rem] max-sm:grid-cols-[minmax(0,1fr)]",
            !keywordMode && aiCustomContent && aiSource === "upload" && cn(
              "search-command__form--expanded h-[7.5rem]",
              variant === "workspace" ? "max-sm:h-[10.25rem]" : variant === "hero" ? "max-sm:h-[8.25rem]" : "",
            ),
            !keywordMode && aiDragActive && "!border-[var(--ai-search)] !bg-[color-mix(in_srgb,var(--ai-search)_10%,var(--surface))]",
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
          <div className="flex min-w-0 items-center sm:h-full">
            <div ref={modeSelectorRef} className="search-mode-select relative ml-1 shrink-0">
              <button
                type="button"
                className={cn("search-mode-select__trigger", keywordMode ? "text-[var(--signal-strong)]" : "text-[var(--ai-search)]")}
                aria-label={`${locale === "fr" ? "Mode de recherche" : "Search mode"} : ${keywordMode ? "Catalogue" : locale === "fr" ? "Similarité IA" : "AI similarity"}`}
                aria-haspopup="listbox"
                aria-expanded={modeMenuOpen}
                aria-controls={modeMenuId}
                onClick={toggleModeMenu}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setModeMenuPlacement(resolveMenuPlacement());
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
                <div ref={modeMenuRef} id={modeMenuId} data-placement={modeMenuPlacement} role="listbox" aria-label={locale === "fr" ? "Choisir le mode de recherche" : "Choose search mode"} className="search-mode-select__menu">
                  <button type="button" role="option" aria-selected={keywordMode} className="search-mode-select__option" onClick={() => switchMode("keyword")}>
                    <Search size={17} aria-hidden="true" />
                    <span><strong>Catalogue</strong><small>{locale === "fr" ? "Titres, filtres et métadonnées" : "Titles, filters and metadata"}</small></span>
                    {keywordMode ? <Check size={14} aria-hidden="true" /> : null}
                  </button>
                  <button type="button" role="option" aria-selected={!keywordMode} disabled={!aiEnabled} className="search-mode-select__option search-mode-select__option--ai disabled:cursor-not-allowed disabled:opacity-45" onClick={() => switchMode("ai")}>
                    <Sparkles size={17} aria-hidden="true" />
                    <span><strong>{locale === "fr" ? "Similarité IA" : "AI similarity"}</strong><small>{aiEnabled ? (locale === "fr" ? "brief, piste, lien ou fichier" : "brief, track, link or file") : (locale === "fr" ? "bientôt disponible" : "coming soon")}</small></span>
                    {!keywordMode ? <Check size={14} aria-hidden="true" /> : null}
                  </button>
                </div>
              ) : null}
            </div>
            {aiCustomContent && !keywordMode ? aiCustomContent : <>
            {aiLeadingContent && !keywordMode ? <span className="grid h-9 w-9 shrink-0 place-items-center text-[var(--ai-search)]">{aiLeadingContent}</span> : null}
            <label htmlFor={id} className="sr-only">{resolvedInputLabel}</label>
            <input
              ref={inputRef}
              id={id}
              value={displayedValue}
              onChange={(event) => {
                setFilterAnnouncement("");
                setPanelDismissed(false);
                if (keywordMode) onValueChange(event.target.value);
                else if (onAiValueChange) onAiValueChange(event.target.value);
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
              aria-expanded={panelOpen || historyOpen}
              aria-controls={historyOpen ? historyId : panelOpen ? suggestionsId : undefined}
              aria-activedescendant={panelOpen && autocomplete.activeIndex >= 0 ? `${suggestionsId}-option-${autocomplete.activeIndex}` : undefined}
              autoComplete="off"
              type={!keywordMode ? aiInputType : "text"}
              maxLength={500}
              placeholder={placeholder}
              className={cn(
                "ai-search-input min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap bg-transparent px-2.5 text-[var(--foreground)] outline-none placeholder:text-current/42 sm:px-3",
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
            </>}
          </div>

          <button
            type="submit"
            disabled={!hasSearchCriteria || (!keywordMode && !aiSubmitEnabled)}
            className={cn(
              "search-command__submit inline-flex min-w-11 items-center justify-center gap-2 whitespace-nowrap px-3 text-sm font-semibold transition disabled:cursor-not-allowed",
              variant === "hero" ? "min-h-12 min-w-12 md:min-h-14 md:min-w-14" : "min-h-11 min-w-11",
              !keywordMode && "search-command__submit--ai",
              !keywordMode && (variant === "workspace" || variant === "hero") && "max-sm:col-span-1 max-sm:w-full",
            )}
            style={!keywordMode ? {
              borderColor: "color-mix(in srgb, var(--ai-search) 62%, var(--line))",
              color: "var(--ai-search)",
              background: "color-mix(in srgb, var(--surface) 82%, transparent)",
              boxShadow: "inset 0 1px 0 color-mix(in srgb, white 18%, transparent), 0 10px 28px color-mix(in srgb, var(--ai-search) 10%, transparent)",
              backdropFilter: "blur(18px)",
            } : undefined}
            aria-label={keywordMode
              ? locale === "fr" ? "Rechercher" : "Search"
              : aiSubmitLabel || (aiSubmitEnabled
                ? locale === "fr" ? "Lancer la recherche de similarité" : "Run similarity search"
                : locale === "fr" ? "Recherche par similarité bientôt disponible" : "Similarity search coming soon")}
          >
            {!keywordMode && aiSubmitLabel ? <span>{aiSubmitLabel}</span> : null}<ArrowRight size={19} aria-hidden="true" />
          </button>
        </form>
      </div>

      <p className="sr-only" aria-live="polite">{filterAnnouncement}</p>

      {historyOpen ? (
        <Suspense fallback={null}>
        <RecentSearchesController
          id={historyId}
          inputId={id}
          mode={mode}
          locale={locale}
          onSelectQuery={selectRecentQuery}
          onClearAnnouncement={() => {
            setFilterAnnouncement(locale === "fr" ? "Historique de recherche effacé" : "Search history cleared");
          }}
        />
        </Suspense>
      ) : null}

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
