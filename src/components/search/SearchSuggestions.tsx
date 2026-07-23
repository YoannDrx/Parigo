"use client";

const SUGGESTIONS = [
  "upbeat", "dramatic", "drama", "positive", "driving", "building", "bright", "fun", "energetic", "dark",
  "happy", "mysterious", "confident", "action", "uplifting", "warm", "uptempo", "tension", "fast", "determined",
  "electronic", "piano", "documentary", "tense", "suspense", "cinematic", "synths", "guitar", "dreamy", "atmospheric",
  "powerful", "strings", "reflective", "synth", "orchestral", "cool", "light", "bouncy", "intense", "quirky",
  "retro", "medium", "edgy", "playful", "dance", "epic", "exciting", "optimistic", "emotional", "aggressive",
  "vocals", "pop", "percussion", "ambient", "mid", "drums", "tempo", "mid-tempo", "hopeful", "party",
  "lively", "romantic", "vocal", "sports", "rock", "sexy", "ominous", "flowing", "adventure", "pulsing",
  "bass", "electronica", "percussive", "gentle", "smooth", "relaxed", "serious", "sound design", "carefree",
  "dynamic", "trailer", "world", "love", "factual", "suspenseful", "gritty", "slow", "mystery", "travel",
  "comedy", "heartfelt", "cheerful", "funky", "film", "underscore", "eerie", "heavy", "anticipation", "tender",
] as const;

export function SearchSuggestions({ locale, onSelect }: { locale: "fr" | "en"; onSelect: (suggestion: string) => void }) {
  return (
    <section className="search-suggestions mb-5 overflow-hidden border-y border-[var(--line)] bg-[var(--surface)] py-3" aria-labelledby="suggested-searches-title">
      <div className="flex items-end justify-between gap-4 px-3 sm:px-4"><h2 id="suggested-searches-title" className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Recherches suggérées" : "Suggested searches"}</h2><span className="shrink-0 font-mono text-[.58rem] text-[var(--text-muted)]">{SUGGESTIONS.length} TAGS →</span></div>
      <div className="suggestion-rail mt-2 grid grid-flow-col grid-rows-4 auto-cols-max gap-1.5 overflow-x-auto px-3 pb-2 pt-1.5 sm:grid-rows-3 sm:px-4" aria-label={locale === "fr" ? "Faire défiler les recherches suggérées horizontalement" : "Scroll suggested searches horizontally"}>{SUGGESTIONS.map((suggestion) => <button key={suggestion} type="button" onClick={() => onSelect(suggestion)} className="search-suggestion-tag min-h-7 border border-[var(--line)] bg-[var(--background)] px-2.5 py-1 text-[.68rem] leading-none transition hover:-translate-y-0.5 hover:border-[var(--signal-strong)] hover:bg-[var(--signal-soft)]">{suggestion}</button>)}</div>
    </section>
  );
}
