"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Search, Sparkles } from "lucide-react";
import { parseSearchIntent, intentToSearchParams } from "@/lib/search-intent";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/I18nProvider";

interface AISearchProps {
  defaultValue?: string;
  compact?: boolean;
  showExamples?: boolean;
  onSearch?: (query: string) => void;
}

const labels: Record<string, string> = {
  cinematic: "Cinématique", electronic: "Électronique", ambient: "Ambient", jazz: "Jazz", techno: "Techno",
  "hip-hop": "Hip-hop", rock: "Rock", pop: "Pop", uplifting: "Solaire", dark: "Sombre",
  energetic: "Énergique", peaceful: "Calme", melancholic: "Mélancolique", tense: "Tension",
  epic: "Épique", playful: "Ludique", piano: "Piano", guitar: "Guitare", strings: "Cordes",
  drums: "Batterie", synth: "Synthé", percussion: "Percussions",
};

export function AISearch({ defaultValue = "", compact = false, showExamples = false, onSearch }: AISearchProps) {
  const { locale, t } = useI18n();
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();
  const intent = useMemo(() => parseSearchIntent(query), [query]);
  const chips = [
    ...intent.genres.map((item) => labels[item] ?? item),
    ...intent.moods.map((item) => labels[item] ?? item),
    ...intent.instruments.map((item) => labels[item] ?? item),
    ...(intent.bpmRange ? [`${intent.bpmRange[0]}–${intent.bpmRange[1]} BPM`] : []),
    ...(intent.isVocal === false ? ["Instrumental"] : intent.isVocal === true ? [locale === "fr" ? "Avec voix" : "Vocals"] : []),
  ];
  const examples = locale === "fr" ? [
    "Une techno magnétique sans voix",
    "Un piano intime pour un documentaire",
    "Une énergie solaire pour une campagne sport",
    "Des cordes épiques entre 120 et 150 BPM",
  ] : [
    "Magnetic techno with no vocals",
    "Intimate piano for a documentary",
    "Bright energy for a sports campaign",
    "Epic strings between 120 and 150 BPM",
  ];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    if (onSearch) onSearch(query.trim());
    else router.push(`/search?${intentToSearchParams(intent).toString()}`);
  };

  return (
    <div className="w-full">
      <form
        onSubmit={submit}
        className={cn(
          "ai-search-shell relative flex items-center border bg-[var(--surface)] text-[var(--foreground)] shadow-[0_24px_80px_rgba(0,0,0,.24)] transition",
          compact ? "rounded-[var(--radius-md)] border-[var(--line)] p-2" : "rounded-[3px] border-white/35 p-2.5 md:p-3"
        )}
      >
        <Sparkles className="ml-2 shrink-0 text-[var(--color-primary-dark)]" size={compact ? 18 : 22} aria-hidden="true" />
        <label htmlFor={compact ? "ai-search-compact" : "ai-search-hero"} className="sr-only">{t("home.searchLabel")}</label>
        <input
          id={compact ? "ai-search-compact" : "ai-search-hero"}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("home.searchPlaceholder")}
          className={cn("ai-search-input min-w-0 flex-1 bg-transparent px-3 outline-none placeholder:text-current/40", compact ? "h-11 text-sm" : "h-14 text-base md:text-lg")}
        />
        <button
          type="submit"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-black)] transition hover:scale-[1.04] hover:bg-[var(--color-signal)] disabled:opacity-50"
          disabled={!query.trim()}
          aria-label={t("common.search")}
        >
          {compact ? <Search size={19} /> : <ArrowUpRight size={22} />}
        </button>
      </form>

      {!compact && (
        <div className="mt-3 flex min-h-7 flex-wrap items-center gap-2 px-2 text-white/70">
          <span className="eyebrow text-white/45">{t("home.searchDisclosure")}</span>
          {chips.map((chip) => <span key={chip} className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs">{chip}</span>)}
        </div>
      )}

      {showExamples && (
        <div className="mt-5 flex flex-wrap gap-2">
          {examples.map((example) => (
            <button key={example} type="button" onClick={() => setQuery(example)} className="min-h-11 rounded-full border border-white/18 bg-white/[0.06] px-4 py-2 text-left text-sm text-white/72 transition hover:border-[var(--color-signal)] hover:text-white">
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
