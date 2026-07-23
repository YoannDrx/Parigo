"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { parseSearchIntent, intentToSearchParams, searchIntentChips } from "@/lib/search-intent";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/I18nProvider";

interface AISearchProps {
  defaultValue?: string;
  compact?: boolean;
  showExamples?: boolean;
  mode?: "keyword" | "assisted";
  onSearch?: (query: string) => void;
}

export function AISearch({ defaultValue = "", compact = false, showExamples = false, mode = "keyword", onSearch }: AISearchProps) {
  const { locale, t } = useI18n();
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();
  const intent = useMemo(() => parseSearchIntent(query), [query]);
  const chips = mode === "assisted" ? searchIntentChips(intent, locale) : [];
  const examples = locale === "fr" ? [
    "Une techno énergique entre 120 et 140 BPM",
    "Un piano intime pour un documentaire",
    "Une énergie solaire pour une campagne sport",
    "Des cordes épiques entre 120 et 150 BPM",
  ] : [
    "Energetic techno between 120 and 140 BPM",
    "Intimate piano for a documentary",
    "Bright energy for a sports campaign",
    "Epic strings between 120 and 150 BPM",
  ];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    if (onSearch) onSearch(query.trim());
    else if (mode === "assisted") router.push(`/search?${intentToSearchParams(intent).toString()}`);
    else router.push(`/search?q=${encodeURIComponent(query.trim())}&view=tracks&type=main`);
  };

  return (
    <div className="w-full">
      <form
        onSubmit={submit}
        className={cn(
          "ai-search-shell relative flex items-center border bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-sm)] transition",
          compact ? "rounded-[var(--radius-md)] border-[var(--line)] p-1.5" : "parigo-frame border-[var(--signal)] p-2 md:p-2.5"
        )}
      >
        {mode === "assisted"
          ? <Sparkles className="ml-2 shrink-0 text-[var(--signal-strong)]" size={compact ? 17 : 20} aria-hidden="true" />
          : <Search className="ml-2 shrink-0 text-[var(--signal-strong)]" size={compact ? 17 : 20} aria-hidden="true" />}
        <label htmlFor={compact ? "ai-search-compact" : "ai-search-hero"} className="sr-only">{t("home.searchLabel")}</label>
        <input
          id={compact ? "ai-search-compact" : "ai-search-hero"}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          maxLength={500}
          placeholder={t("home.searchPlaceholder")}
          className={cn("ai-search-input min-w-0 flex-1 bg-transparent px-3 outline-none placeholder:text-current/42", compact ? "h-11 text-sm" : "h-14 text-base md:h-16 md:text-lg")}
        />
        <button
          type="submit"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--signal-strong)] text-white transition-colors hover:bg-[var(--foreground)] disabled:opacity-40 md:min-h-12 md:min-w-12"
          disabled={!query.trim()}
          aria-label={t("common.search")}
        >
          {compact ? <Search size={18} /> : <ArrowRight size={20} />}
        </button>
      </form>

      {!compact && mode === "assisted" && query.trim().length > 0 && (
        <div className="mt-3 flex min-h-8 flex-wrap items-center gap-2 px-1 text-[var(--text-muted)]" aria-live="polite">
          <span className="eyebrow inline-flex items-center gap-1.5"><Sparkles size={12} />{t("home.searchDisclosure")}</span>
          {chips.map((chip) => <span key={chip.key} className="rounded-full border border-[var(--signal-strong)]/35 bg-[var(--signal-soft)] px-2.5 py-1 text-xs text-[var(--foreground)]">{chip.label}</span>)}
          {intent.isVocal !== null && <span className="rounded-full border border-dashed border-[var(--line-strong)] px-2.5 py-1 text-xs">{locale === "fr" ? "Voix détectée · bientôt disponible" : "Vocals detected · coming soon"}</span>}
          {query.trim() && !chips.length && intent.isVocal === null && <span className="text-xs">{locale === "fr" ? "La phrase sera recherchée par mots-clés." : "The phrase will be searched as keywords."}</span>}
        </div>
      )}

      {showExamples && (
        <div className="mt-5 flex flex-wrap gap-2">
          {examples.map((example) => (
            <button key={example} type="button" onClick={() => setQuery(example)} className="min-h-11 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-left text-sm text-[var(--text-muted)] transition hover:border-[var(--signal)] hover:text-[var(--foreground)]">
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
