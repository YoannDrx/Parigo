"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { parseSearchIntent, intentToSearchParams } from "@/lib/search-intent";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/I18nProvider";

interface AISearchProps {
  defaultValue?: string;
  compact?: boolean;
  showExamples?: boolean;
  mode?: "keyword" | "assisted";
  onSearch?: (query: string) => void;
}

const labelsFr: Record<string, string> = {
  cinematic: "Cinématique", electronic: "Électronique", ambient: "Ambient", jazz: "Jazz", techno: "Techno",
  "hip-hop": "Hip-hop", rock: "Rock", pop: "Pop", uplifting: "Solaire", dark: "Sombre",
  energetic: "Énergique", peaceful: "Calme", melancholic: "Mélancolique", tense: "Tension",
  epic: "Épique", playful: "Ludique", piano: "Piano", guitar: "Guitare", strings: "Cordes",
  drums: "Batterie", synth: "Synthé", percussion: "Percussions",
};

const labelsEn: Record<string, string> = {
  cinematic: "Cinematic", electronic: "Electronic", ambient: "Ambient", jazz: "Jazz", techno: "Techno",
  "hip-hop": "Hip-hop", rock: "Rock", pop: "Pop", uplifting: "Uplifting", dark: "Dark",
  energetic: "Energetic", peaceful: "Peaceful", melancholic: "Melancholic", tense: "Tense",
  epic: "Epic", playful: "Playful", piano: "Piano", guitar: "Guitar", strings: "Strings",
  drums: "Drums", synth: "Synth", percussion: "Percussion",
};

export function AISearch({ defaultValue = "", compact = false, showExamples = false, mode = "keyword", onSearch }: AISearchProps) {
  const { locale, t } = useI18n();
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();
  const labels = locale === "fr" ? labelsFr : labelsEn;
  const intent = useMemo(() => parseSearchIntent(query), [query]);
  const chips = mode === "assisted" ? [
    ...intent.genres.map((item) => labels[item] ?? item),
    ...intent.moods.map((item) => labels[item] ?? item),
    ...intent.instruments.map((item) => labels[item] ?? item),
    ...(intent.bpmRange ? [`${intent.bpmRange[0]}–${intent.bpmRange[1]} BPM`] : []),
    ...(intent.isVocal === false ? [locale === "fr" ? "Instrumental" : "Instrumental"] : intent.isVocal === true ? [locale === "fr" ? "Avec voix" : "Vocals"] : []),
  ] : [];
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
    else if (mode === "assisted") router.push(`/search?${intentToSearchParams(intent).toString()}`);
    else router.push(`/search?q=${encodeURIComponent(query.trim())}&view=tracks&type=main`);
  };

  return (
    <div className="w-full">
      <form
        onSubmit={submit}
        className={cn(
          "ai-search-shell relative flex items-center border bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-sm)] transition",
          compact ? "rounded-[var(--radius-md)] border-[var(--line)] p-1.5" : "rounded-[var(--radius-lg)] border-[var(--signal)] p-2 md:p-2.5"
        )}
      >
        <Search className="ml-2 shrink-0 text-[var(--signal-strong)]" size={compact ? 17 : 20} aria-hidden="true" />
        <label htmlFor={compact ? "ai-search-compact" : "ai-search-hero"} className="sr-only">{t("home.searchLabel")}</label>
        <input
          id={compact ? "ai-search-compact" : "ai-search-hero"}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
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

      {!compact && mode === "assisted" && (
        <div className="mt-3 flex min-h-7 flex-wrap items-center gap-2 px-1 text-[var(--text-muted)]">
          <span className="eyebrow">{t("home.searchDisclosure")}</span>
          {chips.map((chip) => <span key={chip} className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-xs">{chip}</span>)}
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
