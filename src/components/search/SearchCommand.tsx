"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import { ArrowRight, Check, ChevronDown, Search, Sparkles, X } from "lucide-react";
import { SearchAutocompleteMenu } from "@/components/search/SearchAutocompleteMenu";
import { useEmptySearchTranslation, useSearchAutocomplete } from "@/hooks/use-search-autocomplete";
import { cn } from "@/lib/utils";
import type { AutocompleteItem, SearchMode } from "@/types";

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
  onSelect: (item: AutocompleteItem) => void;
  onClear?: () => void;
  offerTranslationWhenEmpty?: boolean;
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
  offerTranslationWhenEmpty = false,
}: SearchCommandProps) {
  const [focused, setFocused] = useState(false);
  const [mode, setMode] = useState<SearchMode>("keyword");
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [aiDraft, setAiDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const modeSelectorRef = useRef<HTMLDivElement>(null);
  const keywordMode = mode === "keyword";
  const displayedValue = keywordMode ? value : aiDraft;
  const normalizedValue = displayedValue.trim();
  const autocomplete = useSearchAutocomplete(displayedValue, locale, focused && keywordMode);
  const emptyTranslation = useEmptySearchTranslation(
    displayedValue,
    locale,
    offerTranslationWhenEmpty
      && keywordMode
      && focused
      && autocomplete.status === "success"
      && autocomplete.groups.length === 0,
  );
  const suggestionsId = `${id}-suggestions`;
  const panelOpen = keywordMode && focused && normalizedValue.length >= 2 && autocomplete.status !== "idle";
  const modeMenuId = `${id}-mode-menu`;

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
    if (!normalizedValue || !keywordMode) return;
    autocomplete.close();
    inputRef.current?.blur();
    onSubmit(normalizedValue);
  };

  const selectSuggestion = (item: AutocompleteItem) => {
    autocomplete.close();
    inputRef.current?.blur();
    onSelect(item);
  };

  const applyTranslationSuggestion = () => {
    const effectiveQuery = emptyTranslation.suggestion?.effective.trim();
    if (!effectiveQuery) return;
    autocomplete.close();
    onValueChange(effectiveQuery);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(effectiveQuery.length, effectiveQuery.length);
    });
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
    inputRef.current?.focus();
  };

  const preserveInputFocus = (event: MouseEvent<HTMLButtonElement>) => event.preventDefault();
  const resolvedInputLabel = keywordMode
    ? inputLabel || (locale === "fr"
      ? "Rechercher un titre, un mot-clé, une ambiance ou un instrument"
      : "Search a title, keyword, mood or instrument")
    : locale === "fr"
      ? "Décrire un brief musical assisté par IA"
      : "Describe an AI-assisted music brief";
  const switchMode = (nextMode: SearchMode) => {
    if (nextMode === "ai" && !aiDraft && value) setAiDraft(value);
    setMode(nextMode);
    setModeMenuOpen(false);
    autocomplete.close();
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <section
      data-testid={`${id}-command`}
      className={cn("search-command relative overflow-visible", className)}
      aria-label={locale === "fr" ? "Recherche dans le catalogue" : "Catalog search"}
    >
      <div className="search-command__row min-w-0">
        <form
          onSubmit={submit}
          data-mode={mode}
          data-has-value={normalizedValue ? "true" : "false"}
          className={cn(
            "search-command__form grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 border bg-[var(--surface)] p-1.5",
            keywordMode ? "search-command__form--keyword" : "search-command__form--ai",
            variant === "hero" ? "min-h-[4.5rem]" : "min-h-14",
          )}
        >
          <div className="flex min-w-0 items-center">
          <div ref={modeSelectorRef} className="search-mode-select relative ml-1 shrink-0">
            <button
              type="button"
              className={cn("search-mode-select__trigger", keywordMode ? "text-[var(--signal-strong)]" : "text-[var(--ai-search)]")}
              aria-label={`${locale === "fr" ? "Mode de recherche" : "Search mode"} : ${keywordMode ? locale === "fr" ? "Mots-clés" : "Keywords" : locale === "fr" ? "Brief IA" : "AI brief"}`}
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
              <ChevronDown className="search-mode-select__chevron" size={11} aria-hidden="true" />
            </button>

            {modeMenuOpen ? (
              <div id={modeMenuId} role="listbox" aria-label={locale === "fr" ? "Choisir le mode de recherche" : "Choose search mode"} className="search-mode-select__menu">
                <button type="button" role="option" aria-selected={keywordMode} className="search-mode-select__option" onClick={() => switchMode("keyword")}>
                  <Search size={17} aria-hidden="true" />
                  <span><strong>{locale === "fr" ? "Mots-clés" : "Keywords"}</strong><small>{locale === "fr" ? "Titres et métadonnées" : "Titles and metadata"}</small></span>
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
            onChange={(event) => keywordMode ? onValueChange(event.target.value) : setAiDraft(event.target.value)}
            onFocus={() => setFocused(true)}
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
                ? "Rechercher un titre, une ambiance, un instrument…"
                : "Décrivez une scène, une émotion ou un usage…"
              : keywordMode
                ? "Search a title, mood or instrument…"
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
            disabled={!normalizedValue || !keywordMode}
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

      {panelOpen ? (
        <SearchAutocompleteMenu
          id={suggestionsId}
          groups={autocomplete.groups}
          activeIndex={autocomplete.activeIndex}
          loading={autocomplete.loading}
          error={autocomplete.status === "error"}
          locale={locale}
          query={normalizedValue}
          translationSuggestion={emptyTranslation.suggestion}
          translationLoading={emptyTranslation.loading}
          onActiveIndexChange={autocomplete.setActiveIndex}
          onSelect={selectSuggestion}
          onApplyTranslation={applyTranslationSuggestion}
          onViewAll={() => submit()}
        />
      ) : null}
    </section>
  );
}
