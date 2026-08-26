"use client";

import { useRef } from "react";
import { FileAudio, Link2, ListMusic, Sparkles, UploadCloud } from "lucide-react";
import { SimilarityPlatformIcon, SIMILARITY_PLATFORMS } from "@/components/search/SimilarityPlatformIcon";
import { cn } from "@/lib/utils";
import type { SimilaritySearchSource } from "@/types";

export const SIMILARITY_SOURCE_ORDER: SimilaritySearchSource[] = ["prompt", "track", "upload", "url"];

export const SIMILARITY_SOURCE_COPY = {
  prompt: {
    fr: "Décrire une musique",
    en: "Describe music",
    detailFr: "Scène, émotion, rythme, instruments ou usage",
    detailEn: "Scene, emotion, rhythm, instruments or use",
    icon: Sparkles,
  },
  track: {
    fr: "À partir de la shortlist",
    en: "From the shortlist",
    detailFr: "Comparez une à dix pistes de travail",
    detailEn: "Compare one to ten working tracks",
    icon: ListMusic,
  },
  upload: {
    fr: "Importer un fichier",
    en: "Upload a file",
    detailFr: "Choisissez un MP3/WAV · 120 Mo · 15 min max.",
    detailEn: "Choose an MP3/WAV · 120 MB · 15 min max.",
    icon: FileAudio,
  },
  url: {
    fr: "Rechercher depuis un lien",
    en: "Search from a link",
    detailFr: "YouTube, Spotify, Vimeo, SoundCloud, Apple Music ou TikTok",
    detailEn: "YouTube, Spotify, Vimeo, SoundCloud, Apple Music or TikTok",
    icon: Link2,
  },
} satisfies Record<SimilaritySearchSource, { fr: string; en: string; detailFr: string; detailEn: string; icon: typeof Sparkles }>;

interface SimilaritySourceRailProps {
  locale: "fr" | "en";
  enabledSources: SimilaritySearchSource[];
  fileStatus: "idle" | "checking" | "valid" | "error";
  fileError?: string;
  onSelectSource: (source: SimilaritySearchSource) => void;
  onSelectFiles: (files: File[]) => void;
  className?: string;
}

export function SimilaritySourceRail({
  locale,
  enabledSources,
  fileStatus,
  fileError,
  onSelectSource,
  onSelectFiles,
  className,
}: SimilaritySourceRailProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const enabled = new Set(enabledSources);
  const selectFiles = (files: File[]) => {
    onSelectFiles(files);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={cn("similarity-hero-hint mt-3 text-center", className)} aria-label={locale === "fr" ? "Fonctionnement de la recherche par similarité IA" : "How AI similarity search works"}>
      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-xs leading-5 text-[var(--text-muted)] sm:text-sm">
        <span className="basis-full sm:hidden">{locale === "fr" ? "Décrivez une scène, une émotion ou un usage" : "Describe a scene, emotion or use"}</span>
        <span className="basis-full sm:hidden">{locale === "fr" ? "Collez un lien public" : "Paste a public link"}</span>
        <span className="hidden sm:inline">{locale === "fr" ? "Décrivez une scène, une émotion ou un usage, ou collez un lien public" : "Describe a scene, emotion or use, or paste a public link"}</span>
        {enabled.has("url") ? <span className="similarity-platform-icons inline-flex items-center gap-1.5" aria-label={locale === "fr" ? "YouTube, Spotify, Vimeo, SoundCloud, Apple Music et TikTok" : "YouTube, Spotify, Vimeo, SoundCloud, Apple Music and TikTok"}>{SIMILARITY_PLATFORMS.map((platform) => <span key={platform.id} title={platform.label}><SimilarityPlatformIcon platform={platform.id} className="h-3.5 w-3.5" /></span>)}</span> : null}
        {enabled.has("upload") ? <><span aria-hidden="true">·</span><button type="button" onClick={() => { onSelectSource("upload"); inputRef.current?.click(); }} className="inline-flex min-h-8 items-center gap-1.5 font-semibold text-[var(--foreground)] underline decoration-[var(--ai-search)] decoration-1 underline-offset-4 transition hover:text-[var(--ai-search)]" aria-label={locale === "fr" ? "Importer un fichier MP3 ou WAV" : "Upload an MP3 or WAV file"}><UploadCloud size={14} aria-hidden="true" />{locale === "fr" ? "Importer un MP3/WAV" : "Upload an MP3/WAV"}</button></> : null}
      </p>
      <input ref={inputRef} type="file" className="sr-only" accept=".mp3,.wav,audio/mpeg,audio/wav" aria-label={locale === "fr" ? "Fichier MP3 ou WAV à analyser" : "MP3 or WAV file to analyse"} onChange={(event) => selectFiles(Array.from(event.target.files ?? []))} />
      {fileStatus === "checking" ? <p role="status" className="mt-2 text-xs text-[var(--text-muted)]">{locale === "fr" ? "Vérification du fichier…" : "Checking file…"}</p> : null}
      {fileError ? <p role="alert" className="mt-2 text-xs font-medium text-[var(--danger)]">{fileError}</p> : null}
    </div>
  );
}
