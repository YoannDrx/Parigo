"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchCommand } from "@/components/search/SearchCommand";
import { useI18n } from "@/components/providers/I18nProvider";
import type { AutocompleteItem, SearchMode } from "@/types";

const SEARCH_EXAMPLES = ["piano", "documentary", "crime investigation", "orchestral tension"];

interface AISearchProps {
  defaultValue?: string;
  compact?: boolean;
  showExamples?: boolean;
  onSearch?: (query: string) => void;
  onModeChange?: (mode: SearchMode) => void;
}

export function AISearch({ defaultValue = "", compact = false, showExamples = false, onSearch, onModeChange }: AISearchProps) {
  const { locale, localizedPath } = useI18n();
  const [query, setQuery] = useState(defaultValue);
  const [stagedFilters, setStagedFilters] = useState<AutocompleteItem[]>([]);
  const router = useRouter();

  const runSearch = (value: string) => {
    const normalized = value.trim();
    if (!normalized && stagedFilters.length === 0) return;
    if (onSearch && stagedFilters.length === 0) {
      onSearch(normalized);
      return;
    }
    const params = new URLSearchParams({ view: "tracks", type: "main" });
    if (normalized) params.set("q", normalized);
    const categories = stagedFilters.filter((item) => item.filterGroup !== "styles").map((item) => item.id);
    const styles = stagedFilters.filter((item) => item.filterGroup === "styles").map((item) => item.id);
    if (categories.length) params.set("categories", [...new Set(categories)].join(","));
    if (styles.length) params.set("styles", [...new Set(styles)].join(","));
    router.push(localizedPath(`/search?${params.toString()}`));
  };

  const selectSuggestion = (item: AutocompleteItem, remainingQuery?: string) => {
    if (item.kind === "filter") {
      if (remainingQuery !== undefined) setQuery(remainingQuery);
      setStagedFilters((current) => current.some((candidate) => candidate.id === item.id && candidate.filterGroup === item.filterGroup)
        ? current
        : [...current, item]);
      return;
    }
    if (item.href) {
      router.push(localizedPath(item.href));
      return;
    }
    setQuery(item.label);
    runSearch(item.label);
  };

  return (
    <div className="w-full">
      <SearchCommand
        id={compact ? "home-search-compact" : "home-search"}
        value={query}
        locale={locale}
        variant={compact ? "compact" : "hero"}
        inputLabel={locale === "fr" ? "Rechercher dans le catalogue Parigo" : "Search the Parigo catalog"}
        onValueChange={setQuery}
        onSubmit={runSearch}
        onSelect={selectSuggestion}
        onClear={() => setStagedFilters([])}
        stagedFilters={stagedFilters}
        onRemoveStagedFilter={(item) => setStagedFilters((current) => current.filter((candidate) => candidate.id !== item.id || candidate.filterGroup !== item.filterGroup))}
        onModeChange={onModeChange}
      />

      {showExamples ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {SEARCH_EXAMPLES.map((example) => (
            <button key={example} type="button" onClick={() => setQuery(example)} className="min-h-11 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-left text-sm text-[var(--text-muted)] transition hover:border-[var(--signal)] hover:text-[var(--foreground)]">
              {example}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
