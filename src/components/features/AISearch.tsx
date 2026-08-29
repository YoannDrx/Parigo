"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileAudio, Link2, X } from "lucide-react";
import { SearchCommand } from "@/components/search/SearchCommand";
import { SimilaritySourceRail, SIMILARITY_SOURCE_ORDER } from "@/components/search/SimilaritySourceRail";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSimilarityCapabilities } from "@/hooks/use-api";
import { useSimilarityFile } from "@/hooks/use-similarity-file";
import { detectSimilarityPlatform, looksLikeExternalUrl } from "@/lib/search/similarity-platforms";
import { setSimilarityHandoff } from "@/stores/similarity-handoff-store";
import type { AutocompleteItem, SearchMode, SimilaritySearchSource } from "@/types";

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
  const [mode, setMode] = useState<SearchMode>("keyword");
  const [sourceIntent, setSourceIntent] = useState<"prompt" | "url" | "upload">("prompt");
  const [stagedFilters, setStagedFilters] = useState<AutocompleteItem[]>([]);
  const router = useRouter();
  const similarityCapabilities = useSimilarityCapabilities();
  const similarityFile = useSimilarityFile({
    locale,
    maxBytes: similarityCapabilities.data?.upload.maxBytes,
    maxDurationSeconds: similarityCapabilities.data?.upload.maxDurationSeconds,
  });
  const file = similarityFile.file;
  const aiEnabled = Boolean(similarityCapabilities.data && (
    similarityCapabilities.data.prompt.enabled
    || similarityCapabilities.data.upload.enabled
    || similarityCapabilities.data.externalUrl.enabled
  ));
  const platform = detectSimilarityPlatform(query);
  const urlLike = looksLikeExternalUrl(query);
  const similaritySource: SimilaritySearchSource = file || sourceIntent === "upload" ? "upload" : urlLike || (!query.trim() && sourceIntent === "url") ? "url" : "prompt";
  const enabledSources = SIMILARITY_SOURCE_ORDER.filter((source) => {
    const capabilities = similarityCapabilities.data;
    if (!capabilities) return false;
    if (source === "track") return capabilities.track.enabled;
    if (source === "prompt") return capabilities.prompt.enabled;
    if (source === "upload") return capabilities.upload.enabled;
    return capabilities.externalUrl.enabled;
  });
  const similarityEnabled = similaritySource === "upload"
    ? Boolean(similarityCapabilities.data?.upload.enabled && file && similarityFile.status === "valid")
    : similaritySource === "url"
      ? Boolean(similarityCapabilities.data?.externalUrl.enabled && platform)
      : Boolean(similarityCapabilities.data?.prompt.enabled && query.trim().length >= 3);

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

  const runSimilaritySearch = (value: string) => {
    const normalized = value.trim();
    if (file) {
      if (!similarityCapabilities.data?.upload.enabled) return;
      setSimilarityHandoff({ source: "upload", file });
    } else if (urlLike) {
      if (!platform || !similarityCapabilities.data?.externalUrl.enabled) return;
      setSimilarityHandoff({ source: "url", url: normalized });
    } else {
      if (normalized.length < 3 || !similarityCapabilities.data?.prompt.enabled) return;
      setSimilarityHandoff({ source: "prompt", prompt: normalized });
    }
    const params = new URLSearchParams({ mode: "ai", source: similaritySource });
    if (similaritySource === "prompt" && normalized) params.set("q", normalized.replace(/\s+/g, " "));
    router.push(localizedPath(`/search?${params.toString()}`));
  };

  const changeMode = (nextMode: SearchMode) => {
    setMode(nextMode);
    onModeChange?.(nextMode);
  };

  const selectSimilaritySource = (source: SimilaritySearchSource) => {
    if (source === "track") {
      setSimilarityHandoff({ source: "track", openPicker: true });
      router.push(localizedPath("/search?mode=ai&source=track&pick=1"));
      return;
    }
    similarityFile.clearFile();
    setQuery("");
    setSourceIntent(source);
  };

  const selectSimilarityFiles = (files: File[]) => {
    setSourceIntent("upload");
    void similarityFile.selectFiles(files);
  };

  return (
    <div className={compact ? "w-full" : "relative min-h-[4.5rem] w-full overflow-visible"}>
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
        mode={mode}
        onModeChange={changeMode}
        aiSource={similaritySource}
        aiValue={file ? "" : query}
        onAiValueChange={(value) => {
          setQuery(value);
          if (looksLikeExternalUrl(value)) setSourceIntent("url");
          else if (value.trim()) setSourceIntent("prompt");
        }}
        onAiSubmit={runSimilaritySearch}
        aiEnabled={aiEnabled}
        aiSubmitEnabled={similarityEnabled}
        aiHasCriteria={similarityEnabled}
        aiPlaceholder={compact
          ? locale === "fr" ? "Brief, lien ou fichier audio…" : "Brief, link or audio file…"
          : locale === "fr" ? "Décrivez une musique, collez un lien ou déposez un MP3/WAV…" : "Describe music, paste a link or drop an MP3/WAV…"}
        aiInputLabel={locale === "fr" ? "Brief, lien ou fichier pour la similarité IA" : "Brief, link or file for AI similarity"}
        aiInputType={urlLike ? "url" : "text"}
        aiSubmitLabel={similaritySource === "upload"
          ? locale === "fr" ? "Envoyer et analyser" : "Upload and analyse"
          : similaritySource === "url"
            ? locale === "fr" ? "Analyser le lien" : "Analyse link"
            : locale === "fr" ? "Lancer le brief" : "Run brief"}
        aiLeadingContent={similaritySource === "url" ? <Link2 size={17} className="text-[var(--text-muted)]" /> : undefined}
        aiCustomContent={file ? <div className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3"><FileAudio size={21} className="shrink-0 text-[var(--text-muted)]" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{file.name}</strong><small className="text-[.65rem] text-[var(--text-muted)]">{(file.size / 1_048_576).toFixed(1)} Mo</small></span><button type="button" onClick={similarityFile.clearFile} className="grid h-10 w-10 shrink-0 place-items-center" aria-label={locale === "fr" ? "Retirer le fichier" : "Remove file"}><X size={16} /></button></div> : undefined}
        onAiFilesDrop={selectSimilarityFiles}
        aiRecentEnabled={similaritySource === "prompt" && !file}
      />

      {mode === "ai" ? <SimilaritySourceRail
        locale={locale}
        enabledSources={enabledSources}
        fileStatus={similarityFile.status}
        fileError={urlLike && !platform
          ? locale === "fr" ? "Ce lien ne provient pas d’une plateforme compatible." : "This link is not from a supported platform."
          : similarityFile.error}
        onSelectSource={selectSimilaritySource}
        onSelectFiles={selectSimilarityFiles}
        className="relative mx-auto max-w-[58rem] md:absolute md:inset-x-0 md:top-full"
      /> : null}

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
