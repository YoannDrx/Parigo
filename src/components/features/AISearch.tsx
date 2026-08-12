"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchCommand } from "@/components/search/SearchCommand";
import { useI18n } from "@/components/providers/I18nProvider";
import type { AutocompleteItem } from "@/types";

const SEARCH_EXAMPLES = ["piano", "documentary", "crime investigation", "orchestral tension"];

interface AISearchProps {
  defaultValue?: string;
  compact?: boolean;
  showExamples?: boolean;
  onSearch?: (query: string) => void;
}

export function AISearch({ defaultValue = "", compact = false, showExamples = false, onSearch }: AISearchProps) {
  const { locale, localizedPath } = useI18n();
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();

  const runSearch = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return;
    if (onSearch) onSearch(normalized);
    else router.push(localizedPath(`/search?q=${encodeURIComponent(normalized)}&view=tracks&type=main`));
  };

  const selectSuggestion = (item: AutocompleteItem) => {
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
        offerTranslationWhenEmpty
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
