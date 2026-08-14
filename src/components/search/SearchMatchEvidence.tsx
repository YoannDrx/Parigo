import type { SearchMatchEvidence as SearchMatchEvidenceValue, SearchMatchField } from "@/types";
import { cn } from "@/lib/utils";

const labels: Record<"fr" | "en", Record<SearchMatchField, string>> = {
  fr: {
    trackTitle: "Titre",
    albumTitle: "Album",
    description: "Description",
    keyword: "Mot-clé",
    genre: "Genre",
    mood: "Ambiance",
    musicFor: "Usage",
    instrument: "Instrument",
    albumKeyword: "Mot-clé album",
    albumDescription: "Description album",
    catalogReference: "Référence",
    playlistTitle: "Playlist",
    labelName: "Label",
    composerName: "Compositeur",
    lyrics: "Paroles",
  },
  en: {
    trackTitle: "Title",
    albumTitle: "Album",
    description: "Description",
    keyword: "Keyword",
    genre: "Genre",
    mood: "Mood",
    musicFor: "Music for",
    instrument: "Instrument",
    albumKeyword: "Album keyword",
    albumDescription: "Album description",
    catalogReference: "Reference",
    playlistTitle: "Playlist",
    labelName: "Label",
    composerName: "Composer",
    lyrics: "Lyrics",
  },
};

function EvidencePill({ evidence, locale }: { evidence: SearchMatchEvidenceValue; locale: "fr" | "en" }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 border border-[var(--line)] bg-[var(--surface-soft)] px-1.5 py-0.5 text-[.62rem] leading-4 text-[var(--text-muted)]">
      <span className="font-semibold text-[var(--foreground)]">{labels[locale][evidence.field]}</span>
      <span aria-hidden="true">·</span>
      <span className="max-w-44 truncate">{evidence.value}</span>
    </span>
  );
}

export function SearchMatchEvidence({
  items,
  locale,
  className,
  limit = 2,
  expandable = true,
}: {
  items?: SearchMatchEvidenceValue[];
  locale: "fr" | "en";
  className?: string;
  limit?: number;
  expandable?: boolean;
}) {
  if (!items?.length) return null;
  const visible = items.slice(0, limit);
  const additional = items.slice(limit);
  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-1", className)} aria-label={locale === "fr" ? "Raisons de la correspondance" : "Match reasons"}>
      {visible.map((evidence, index) => <EvidencePill key={`${evidence.field}-${evidence.value}-${index}`} evidence={evidence} locale={locale} />)}
      {additional.length > 0 && !expandable && (
        <span
          className="inline-flex min-h-5 items-center border border-dashed border-[var(--line-strong)] px-1.5 text-[.62rem] font-semibold text-[var(--text-muted)]"
          title={additional.map((evidence) => `${labels[locale][evidence.field]} · ${evidence.value}`).join("\n")}
        >
          +{additional.length}<span className="sr-only"> {locale === "fr" ? "raisons supplémentaires" : "more reasons"}</span>
        </span>
      )}
      {additional.length > 0 && expandable && (
        <details className="group/evidence relative">
          <summary className="inline-flex min-h-5 cursor-pointer list-none items-center border border-dashed border-[var(--line-strong)] px-1.5 text-[.62rem] font-semibold text-[var(--text-muted)] marker:content-none">
            +{additional.length}
            <span className="sr-only"> {locale === "fr" ? "raisons supplémentaires" : "more reasons"}</span>
          </summary>
          <div className="absolute left-0 top-full z-30 mt-1 flex min-w-52 max-w-72 flex-wrap gap-1 border border-[var(--line-strong)] bg-[var(--surface)] p-2 shadow-lg">
            {additional.map((evidence, index) => <EvidencePill key={`${evidence.field}-${evidence.value}-${index}`} evidence={evidence} locale={locale} />)}
          </div>
        </details>
      )}
    </div>
  );
}
