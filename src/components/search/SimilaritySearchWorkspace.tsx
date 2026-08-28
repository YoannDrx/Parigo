"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
import { useQueries } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, ListPlus, RotateCcw, Sparkles, UploadCloud, X } from "lucide-react";
import { TrackRow } from "@/components/features/TrackRow";
import { useI18n } from "@/components/providers/I18nProvider";
import { SIMILARITY_SOURCE_COPY, SIMILARITY_SOURCE_ORDER } from "@/components/search/SimilaritySourceRail";
import { SimilarityPlatformIcon, SIMILARITY_PLATFORMS } from "@/components/search/SimilarityPlatformIcon";
import { AnchoredPopover } from "@/components/ui/AnchoredPopover";
import { Button } from "@/components/ui/Button";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { Select } from "@/components/ui/Select";
import { useSimilarityCapabilities } from "@/hooks/use-api";
import { useSimilarityFile } from "@/hooks/use-similarity-file";
import {
  SimilarityApiError,
  confirmSimilarityUpload,
  createSimilarityReference,
  fetchTrack,
  prepareSimilarityUpload,
  runSimilaritySearch,
} from "@/lib/api-client";
import { detectSimilarityPlatform, looksLikeExternalUrl } from "@/lib/search/similarity-platforms";
import { similarityAudioContentType } from "@/lib/search/similarity-files";
import { cn } from "@/lib/utils";
import { useShortlistStore } from "@/stores/shortlist-store";
import type { SimilarityHandoff } from "@/stores/similarity-handoff-store";
import { clearSimilarityHandoff } from "@/stores/similarity-handoff-store";
import type { Album, SimilaritySearchRequest, SimilaritySearchSource, Track } from "@/types";

interface ControllerOptions {
  source: SimilaritySearchSource;
  prompt: string;
  initialSeedIds?: string[];
  autoRunTrack?: boolean;
  initialHandoff?: SimilarityHandoff | null;
  onPromptChange: (value: string) => void;
  onSourceChange: (source: SimilaritySearchSource) => void;
}

function albumFromTrack(track: Track): Album {
  return {
    id: track.albumId,
    slug: track.albumSlug,
    title: track.albumTitle || "",
    cover: track.albumCover || "/images/placeholder-album.svg",
    label: track.albumLabel || "",
    labelSlug: track.albumLabelSlug,
    code: track.albumCode || track.cdCode,
    genres: track.genres,
    moods: track.moods,
    trackCount: 0,
  };
}

function putFile(
  uploadUrl: string,
  contentType: string,
  file: File,
  onProgress: (progress: number) => void,
  register: (request: XMLHttpRequest | null) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    register(request);
    request.open("PUT", uploadUrl);
    request.setRequestHeader("Content-Type", contentType);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => { register(null); reject(new Error("UPLOAD_FAILED")); };
    request.onabort = () => { register(null); reject(new Error("UPLOAD_ABORTED")); };
    request.onload = () => {
      register(null);
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error("UPLOAD_FAILED"));
    };
    request.send(file);
  });
}

function publicError(locale: "fr" | "en", source: SimilaritySearchSource, caught: unknown) {
  const pending = caught instanceof SimilarityApiError && caught.code === "SIMILARITY_ANALYSIS_PENDING";
  if (pending) return locale === "fr" ? "L’analyse de la référence prend plus de temps que prévu." : "The reference is taking longer than expected to analyse.";
  const messages: Record<SimilaritySearchSource, [string, string]> = {
    prompt: ["Le brief n’a pas pu être analysé.", "The brief could not be analysed."],
    track: ["La recherche depuis les pistes de référence n’a pas pu aboutir.", "The reference-track search could not be completed."],
    upload: ["Le fichier n’a pas pu être analysé.", "The file could not be analysed."],
    url: ["Ce lien n’a pas pu être analysé.", "This link could not be analysed."],
  };
  return messages[source][locale === "fr" ? 0 : 1];
}

export function useSimilaritySearchController({
  source,
  prompt,
  initialSeedIds = [],
  autoRunTrack = false,
  initialHandoff,
  onPromptChange,
  onSourceChange,
}: ControllerOptions) {
  const { locale } = useI18n();
  const capabilitiesQuery = useSimilarityCapabilities();
  const shortlistItems = useShortlistStore((value) => value.items);
  const addToShortlistSilently = useShortlistStore((value) => value.addSilently);
  const shortlist = useMemo(() => shortlistItems.map((item) => item.track), [shortlistItems]);
  const [initialReferenceTracks] = useState<Track[]>(
    () => initialHandoff?.source === "track" && "tracks" in initialHandoff ? initialHandoff.tracks : [],
  );
  const [seedIds, setSeedIds] = useState<string[]>(() => {
    const explicit = [...new Set(initialSeedIds)].slice(0, 10);
    return explicit;
  });
  const [includeSeed, setIncludeSeed] = useState(false);
  const [prioritizeBpm, setPrioritizeBpm] = useState(false);
  const [urlState, setUrl] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [state, setState] = useState<"idle" | "preparing" | "uploading" | "analyzing" | "searching" | "done" | "error">("idle");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [total, setTotal] = useState(0);
  const [indexed, setIndexed] = useState<boolean | undefined>();
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const [lastCompletedSource, setLastCompletedSource] = useState<SimilaritySearchSource | null>(null);
  const [lastSubmittedSeedIds, setLastSubmittedSeedIds] = useState<string[]>([]);
  const runSequence = useRef(0);
  const searchAbort = useRef<AbortController | null>(null);
  const uploadRequest = useRef<XMLHttpRequest | null>(null);
  const autoRunStarted = useRef<string | null>(null);

  const capabilities = capabilitiesQuery.data;
  const similarityFile = useSimilarityFile({
    locale,
    maxBytes: capabilities?.upload.maxBytes,
    maxDurationSeconds: capabilities?.upload.maxDurationSeconds,
    initialFile: initialHandoff?.source === "upload" ? initialHandoff.file : null,
  });
  const file = similarityFile.file;
  const url = urlState || (initialHandoff?.source === "url" ? initialHandoff.url : "");
  const effectivePrompt = prompt || (initialHandoff?.source === "prompt" ? initialHandoff.prompt : "");
  const enabledSources = useMemo<SimilaritySearchSource[]>(() => {
    if (!capabilities) return [];
    return [
      ...(capabilities.prompt.enabled ? ["prompt" as const] : []),
      ...(capabilities.track.enabled ? ["track" as const] : []),
      ...(capabilities.upload.enabled ? ["upload" as const] : []),
      ...(capabilities.externalUrl.enabled ? ["url" as const] : []),
    ];
  }, [capabilities]);
  const effectiveSource = enabledSources.includes(source) ? source : enabledSources[0] ?? source;
  const busy = ["preparing", "uploading", "analyzing", "searching"].includes(state);
  const platform = detectSimilarityPlatform(url);
  const trackAutoRunKey = autoRunTrack && initialSeedIds.length
    ? `track:${initialSeedIds.join(",")}`
    : null;
  const knownReferenceTracks = useMemo(() => new Map(
    [...shortlist, ...initialReferenceTracks].map((track) => [track.id, track] as const),
  ), [initialReferenceTracks, shortlist]);
  const referenceQueries = useQueries({
    queries: seedIds.map((id) => ({
      queryKey: ["track", id],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchTrack(id, signal),
      initialData: knownReferenceTracks.get(id),
      staleTime: 5 * 60_000,
      retry: 1,
    })),
  });
  const referenceItems = seedIds.map((id, index) => ({
    id,
    track: referenceQueries[index]?.data,
    loading: referenceQueries[index]?.isLoading ?? false,
    error: referenceQueries[index]?.isError ?? false,
  }));
  const referencesDirty = lastCompletedSource === "track"
    && state === "done"
    && seedIds.join("\u0000") !== lastSubmittedSeedIds.join("\u0000");

  const abortCurrent = useCallback(() => {
    runSequence.current += 1;
    searchAbort.current?.abort();
    searchAbort.current = null;
    uploadRequest.current?.abort();
    uploadRequest.current = null;
  }, []);

  useEffect(() => () => {
    abortCurrent();
    autoRunStarted.current = null;
  }, [abortCurrent]);

  const selectSource = (nextSource: SimilaritySearchSource) => {
    if (nextSource === source) return;
    abortCurrent();
    setError(null);
    if (nextSource !== "upload") similarityFile.clearFile();
    if (busy) setState(tracks.length ? "done" : "idle");
    onSourceChange(nextSource);
  };

  const performSearch = useCallback(async (request: SimilaritySearchRequest, requestSource: SimilaritySearchSource) => {
    abortCurrent();
    const sequence = ++runSequence.current;
    const controller = new AbortController();
    searchAbort.current = controller;
    setState("searching");
    setError(null);
    setIndexed(undefined);
    if (request.type === "track") setLastSubmittedSeedIds(request.seedTrackIds);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const result = await runSimilaritySearch(request, controller.signal);
        if (sequence !== runSequence.current) return;
        setTracks(result.data.tracks);
        setTotal(result.meta.total);
        setIndexed(result.data.indexed);
        setLastCompletedSource(requestSource);
        setState("done");
        searchAbort.current = null;
        return;
      } catch (caught) {
        if (sequence !== runSequence.current || controller.signal.aborted) return;
        if (caught instanceof SimilarityApiError && caught.code === "SIMILARITY_ANALYSIS_PENDING" && attempt < 4) {
          setState("analyzing");
          await new Promise((resolve) => window.setTimeout(resolve, Math.min(2 ** attempt * 2_000, 16_000)));
          continue;
        }
        setError({
          message: publicError(locale, requestSource, caught),
          requestId: caught instanceof SimilarityApiError ? caught.requestId : undefined,
        });
        setState("error");
        searchAbort.current = null;
        return;
      }
    }
  }, [abortCurrent, locale]);

  const uploadAndSearch = useCallback(async () => {
    if (!file) return;
    const contentType = similarityAudioContentType(file);
    if (!contentType) return;
    try {
      abortCurrent();
      const sequence = runSequence.current;
      const controller = new AbortController();
      searchAbort.current = controller;
      setState("preparing");
      setError(null);
      const prepared = await prepareSimilarityUpload({ fileName: file.name, contentType, size: file.size }, controller.signal);
      if (sequence !== runSequence.current || controller.signal.aborted) return;
      setUploadProgress(0);
      setState("uploading");
      await putFile(prepared.uploadUrl, prepared.contentType, file, setUploadProgress, (request) => { uploadRequest.current = request; });
      if (sequence !== runSequence.current || controller.signal.aborted) return;
      setState("analyzing");
      const confirmed = await confirmSimilarityUpload(prepared.uploadToken, controller.signal);
      if (sequence !== runSequence.current || controller.signal.aborted) return;
      await performSearch({ type: "upload", referenceToken: confirmed.referenceToken }, "upload");
    } catch (caught) {
      if (caught instanceof Error && (caught.message === "UPLOAD_ABORTED" || caught.name === "AbortError")) return;
      setError({
        message: publicError(locale, "upload", caught),
        requestId: caught instanceof SimilarityApiError ? caught.requestId : undefined,
      });
      setState("error");
    }
  }, [abortCurrent, file, locale, performSearch]);

  const submit = useCallback(async () => {
    if (busy) return;
    if (effectiveSource === "track" && seedIds.length) {
      await performSearch({ type: "track", seedTrackIds: seedIds.slice(0, 10), includeSeed, prioritizeBpm }, "track");
    } else if (effectiveSource === "prompt" && effectivePrompt.trim().length >= 3) {
      await performSearch({ type: "prompt", prompt: effectivePrompt.trim(), locale }, "prompt");
    } else if (effectiveSource === "upload") {
      await uploadAndSearch();
    } else if (effectiveSource === "url" && platform) {
      try {
        abortCurrent();
        const sequence = runSequence.current;
        const controller = new AbortController();
        searchAbort.current = controller;
        setState("preparing");
        setError(null);
        const reference = await createSimilarityReference(url.trim(), controller.signal);
        if (sequence !== runSequence.current || controller.signal.aborted) return;
        await performSearch({ type: "url", referenceToken: reference.referenceToken }, "url");
      } catch (caught) {
        if (caught instanceof Error && caught.name === "AbortError") return;
        setError({ message: publicError(locale, "url", caught), requestId: caught instanceof SimilarityApiError ? caught.requestId : undefined });
        setState("error");
      }
    }
  }, [abortCurrent, busy, effectivePrompt, effectiveSource, includeSeed, locale, performSearch, platform, prioritizeBpm, seedIds, uploadAndSearch, url]);

  useEffect(() => {
    if (!capabilities || !enabledSources.includes(source)) return;
    if (source === "track" && trackAutoRunKey) {
      if (autoRunStarted.current === trackAutoRunKey) return;
      autoRunStarted.current = trackAutoRunKey;
      const requestedSeeds = [...new Set(initialSeedIds)].slice(0, 10);
      void performSearch({ type: "track", seedTrackIds: requestedSeeds, includeSeed, prioritizeBpm }, "track");
      if (initialHandoff?.source === "track") clearSimilarityHandoff("track");
      return;
    }
    if (autoRunStarted.current || source === "track") return;
    if (initialHandoff?.source === "upload" && similarityFile.status !== "valid") return;
    const shouldRun = initialHandoff?.source === source
      || (source === "prompt" && effectivePrompt.trim().length >= 3);
    if (!shouldRun) return;
    autoRunStarted.current = `handoff:${source}`;
    const timeout = window.setTimeout(() => {
      if (initialHandoff?.source === "url") setUrl(initialHandoff.url);
      if (initialHandoff?.source === "prompt") onPromptChange(initialHandoff.prompt);
      void submit();
      if (initialHandoff?.source === source) clearSimilarityHandoff(source);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [capabilities, effectivePrompt, enabledSources, includeSeed, initialHandoff, initialSeedIds, onPromptChange, performSearch, prioritizeBpm, similarityFile.status, source, submit, trackAutoRunKey]);

  const selectFiles = async (files: File[]) => {
    setUploadProgress(0);
    setError(null);
    return similarityFile.selectFiles(files);
  };
  const toggleSeed = (id: string) => setSeedIds((current) => current.includes(id)
    ? current.filter((candidate) => candidate !== id)
    : current.length < 10 ? [...current, id] : current);
  const canSubmit = !busy && (
    effectiveSource === "track" ? seedIds.length > 0
      : effectiveSource === "prompt" ? effectivePrompt.trim().length >= 3
        : effectiveSource === "upload" ? Boolean(file && similarityFile.status === "valid")
          : Boolean(url.trim() && platform)
  );

  return {
    locale, capabilitiesQuery, capabilities, enabledSources, effectiveSource, selectSource,
    shortlist, seedIds, toggleSeed, referenceItems, referencesDirty, lastSubmittedSeedIds,
    addToShortlistSilently, includeSeed, setIncludeSeed, prioritizeBpm, setPrioritizeBpm,
    prompt: effectivePrompt, onPromptChange, url, setUrl, platform, file,
    fileStatus: similarityFile.status, fileError: similarityFile.error, selectFiles, clearFile: similarityFile.clearFile, uploadProgress,
    state, tracks, total, indexed, error, busy, canSubmit, submit, lastCompletedSource,
  };
}

export type SimilaritySearchController = ReturnType<typeof useSimilaritySearchController>;

export function SimilarityCommandContent({
  controller,
  initialPickerOpen = false,
  onInitialPickerConsumed,
}: {
  controller: SimilaritySearchController;
  initialPickerOpen?: boolean;
  onInitialPickerConsumed?: () => void;
}) {
  const [shortlistOpen, setShortlistOpen] = useState(initialPickerOpen);
  const [dragActive, setDragActive] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const initialPickerConsumedRef = useRef(false);
  const panelId = useId();
  const { locale, effectiveSource: source } = controller;
  const shortlistedIds = new Set(controller.shortlist.map((track) => track.id));
  const shortlistCandidates = controller.shortlist.filter((track) => !controller.seedIds.includes(track.id));
  const firstReference = controller.referenceItems[0]?.track;

  useEffect(() => {
    if (!initialPickerOpen || initialPickerConsumedRef.current) return;
    initialPickerConsumedRef.current = true;
    setShortlistOpen(true);
    onInitialPickerConsumed?.();
  }, [initialPickerOpen, onInitialPickerConsumed]);

  const closeShortlist = () => {
    setShortlistOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  if (source === "track") {
    return <div className="relative flex min-w-0 flex-1 items-center">
      <button ref={triggerRef} type="button" onClick={() => setShortlistOpen((open) => !open)} aria-expanded={shortlistOpen} aria-controls={panelId} className="similarity-shortlist-trigger flex min-h-11 min-w-0 flex-1 items-center gap-3 px-3 text-left">
        <span className="similarity-shortlist-trigger__chevron grid h-8 w-8 shrink-0 place-items-center text-[var(--text-muted)]" aria-hidden="true">{shortlistOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
        <span className="min-w-0"><strong className="block truncate text-sm">{controller.seedIds.length
          ? controller.seedIds.length === 1 && firstReference
            ? locale === "fr" ? `Référence : ${firstReference.title}` : `Reference: ${firstReference.title}`
            : locale === "fr" ? `${controller.seedIds.length} pistes de référence` : `${controller.seedIds.length} reference tracks`
          : locale === "fr" ? "Choisir des pistes de référence" : "Choose reference tracks"}</strong><small className="block truncate text-[.65rem] text-[var(--text-muted)]">{locale === "fr" ? "Une à dix pistes du catalogue ou de votre shortlist" : "One to ten tracks from the catalogue or your shortlist"}</small></span>
      </button>
      <AnchoredPopover id={panelId} open={shortlistOpen} onClose={closeShortlist} anchorRef={triggerRef} anchorContainerSelector=".search-command__form" label={locale === "fr" ? "Choisir les pistes de référence" : "Choose reference tracks"} className="similarity-command-panel !border-[var(--ai-search)] !p-3 shadow-[var(--shadow-xl)]">
        <div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><strong className="text-sm">{locale === "fr" ? "Pistes de référence" : "Reference tracks"}</strong><span className="font-mono text-[.62rem] text-[var(--text-muted)]">{controller.seedIds.length} / 10</span></div><button type="button" onClick={closeShortlist} className="grid h-9 w-9 place-items-center" aria-label={locale === "fr" ? "Fermer la sélection" : "Close selection"}><X size={16} /></button></div>
        {controller.referenceItems.length ? <div className="grid gap-2" aria-label={locale === "fr" ? "Références utilisées" : "Selected references"}>{controller.referenceItems.map(({ id, track, loading, error }) => <div key={id} className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border border-[var(--ai-search)] bg-[color-mix(in_srgb,var(--ai-search)_7%,var(--surface))] px-3 py-2"><span className="min-w-0"><strong className="block truncate text-sm">{track?.title || (loading ? locale === "fr" ? "Chargement de la piste…" : "Loading track…" : error ? locale === "fr" ? "Piste indisponible" : "Track unavailable" : id)}</strong><small className="block truncate text-[var(--text-muted)]">{track?.albumTitle || (shortlistedIds.has(id) ? locale === "fr" ? "Depuis votre shortlist" : "From your shortlist" : locale === "fr" ? "Référence du catalogue" : "Catalog reference")}</small></span><span className="flex items-center gap-1">{track && !shortlistedIds.has(id) ? <button type="button" onClick={() => controller.addToShortlistSilently(track)} className="inline-flex min-h-9 items-center gap-1.5 px-2 text-[.65rem] font-semibold text-[var(--signal-strong)] transition hover:bg-[var(--surface)]" aria-label={`${locale === "fr" ? "Ajouter à la shortlist" : "Add to shortlist"} : ${track.title}`}><ListPlus size={14} />{locale === "fr" ? "Shortlist" : "Shortlist"}</button> : null}<button type="button" onClick={() => controller.toggleSeed(id)} className="grid h-9 w-9 place-items-center text-[var(--text-muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]" aria-label={`${locale === "fr" ? "Retirer des références" : "Remove from references"} : ${track?.title || id}`}><X size={15} /></button></span></div>)}</div> : <p className="border border-dashed border-[var(--line-strong)] p-4 text-sm text-[var(--text-muted)]">{locale === "fr" ? "Aucune référence sélectionnée." : "No reference selected."}</p>}
        <div className="mt-3 border-t border-[var(--line)] pt-3"><div className="mb-2 flex items-center justify-between gap-3"><strong className="text-xs">{locale === "fr" ? "Ajouter depuis votre shortlist" : "Add from your shortlist"}</strong>{controller.seedIds.length >= 10 ? <span className="text-[.62rem] font-semibold text-[var(--ai-search)]">{locale === "fr" ? "Limite atteinte" : "Limit reached"}</span> : null}</div>{shortlistCandidates.length ? <div className="grid gap-2">{shortlistCandidates.map((track) => <label key={track.id} className={cn("flex min-h-12 items-center gap-3 border border-[var(--line)] px-3", controller.seedIds.length < 10 ? "cursor-pointer hover:border-[var(--ai-search)]" : "cursor-not-allowed opacity-45")}><input type="checkbox" className="accent-[var(--ai-search)]" checked={false} disabled={controller.seedIds.length >= 10} onChange={() => controller.toggleSeed(track.id)} /><span className="min-w-0"><strong className="block truncate text-sm">{track.title}</strong><small className="block truncate text-[var(--text-muted)]">{track.albumTitle}</small></span></label>)}</div> : <p className="border border-dashed border-[var(--line-strong)] p-3 text-xs text-[var(--text-muted)]">{controller.shortlist.length ? (locale === "fr" ? "Toutes les pistes de votre shortlist sont déjà utilisées." : "Every shortlist track is already selected.") : (locale === "fr" ? "Votre shortlist est vide. Vous pouvez tout de même lancer une recherche depuis une piste du catalogue." : "Your shortlist is empty. You can still search from a catalog track.")}</p>}</div>
        <div className="mt-3 flex flex-wrap gap-4 border-t border-[var(--line)] pt-3 text-xs"><label className="inline-flex items-center gap-2"><input type="checkbox" className="accent-[var(--ai-search)]" checked={controller.includeSeed} onChange={(event) => controller.setIncludeSeed(event.target.checked)} />{locale === "fr" ? "Inclure les pistes sources" : "Include source tracks"}</label>{controller.capabilities?.track.prioritizeBpm ? <label className="inline-flex items-center gap-2"><input type="checkbox" className="accent-[var(--ai-search)]" checked={controller.prioritizeBpm} onChange={(event) => controller.setPrioritizeBpm(event.target.checked)} />{locale === "fr" ? "Prioriser le BPM" : "Prioritise BPM"}</label> : null}</div>
      </AnchoredPopover>
    </div>;
  }

  if (source === "upload") {
    return <div className="similarity-dropzone-viewport flex min-w-0 flex-1 self-start overflow-hidden">
      <label
        className={cn("similarity-dropzone m-3 flex min-h-[4.75rem] min-w-0 flex-1 cursor-pointer items-center justify-center gap-3 rounded-[var(--parigo-corner-md)] border border-dashed px-4 py-3 text-center sm:m-4", dragActive ? "border-[var(--ai-search)] bg-[color-mix(in_srgb,var(--ai-search)_11%,var(--surface))]" : "border-[var(--line-strong)]")}
        onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => { event.preventDefault(); event.stopPropagation(); setDragActive(false); void controller.selectFiles(Array.from(event.dataTransfer.files)); }}
      >
        <UploadCloud size={22} className="shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
        <span className="min-w-0"><strong className="block truncate text-sm">{controller.file?.name || (controller.fileStatus === "checking" ? (locale === "fr" ? "Vérification du fichier…" : "Checking file…") : locale === "fr" ? "Déposez un MP3 ou WAV, ou cliquez pour le choisir" : "Drop an MP3 or WAV, or click to choose it")}</strong><small className="block text-[.65rem] text-[var(--text-muted)]">{controller.file ? `${(controller.file.size / 1_048_576).toFixed(1)} Mo` : locale === "fr" ? "120 Mo et 15 minutes maximum" : "120 MB and 15 minutes maximum"}</small></span>
        <input className="sr-only" type="file" accept=".mp3,.wav,audio/mpeg,audio/wav" onChange={(event) => { void controller.selectFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
      </label>
    </div>;
  }

  return null;
}

function EmptyState({ controller }: { controller: SimilaritySearchController }) {
  const { locale, effectiveSource: source } = controller;
  const content = {
    track: ["Choisissez vos pistes de référence", "Sélectionnez une à dix pistes du catalogue ou de votre shortlist pour trouver les titres qui leur ressemblent."],
    prompt: ["Décrivez la musique recherchée", "Indiquez une scène, une émotion, un rythme, des instruments ou un usage."],
    upload: ["Utilisez un fichier comme référence", "Déposez un MP3 ou WAV dans la barre pour comparer sa couleur musicale au catalogue."],
    url: ["Utilisez un lien public", "Collez dans la barre un lien provenant de l’une des plateformes compatibles."],
  }[source];
  const english = {
    track: ["Choose your reference tracks", "Select one to ten catalog or shortlist tracks to find music that sounds similar."],
    prompt: ["Describe the music you need", "Include a scene, emotion, rhythm, instruments or intended use."],
    upload: ["Use a file as reference", "Drop an MP3 or WAV in the bar to compare its musical character with the catalogue."],
    url: ["Use a public link", "Paste a link from one of the supported platforms in the bar."],
  }[source];
  const copy = locale === "fr" ? content : english;
  return <div className="border border-[var(--line-strong)] bg-[var(--surface)] px-5 py-20 text-center"><Sparkles className="mx-auto text-[var(--text-muted)]" size={26} /><h2 className="mt-5 text-3xl">{copy[0]}</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--text-muted)]">{copy[1]}</p>{source === "url" ? <div className="mt-5 flex flex-wrap justify-center gap-2" aria-label={locale === "fr" ? "Plateformes compatibles" : "Supported platforms"}>{SIMILARITY_PLATFORMS.map((item) => <span key={item.id} className="grid h-9 w-9 place-items-center border border-[var(--line)] text-[var(--text-muted)]" title={item.label}><SimilarityPlatformIcon platform={item.id} /></span>)}</div> : null}</div>;
}

type SimilarityDensity = "full" | "mid" | "light";

export function SimilaritySearchWorkspace({
  controller,
  density,
  onDensityChange,
  resultsAnchorRef,
}: {
  controller: SimilaritySearchController;
  density: SimilarityDensity;
  onDensityChange: (density: SimilarityDensity) => void;
  resultsAnchorRef: RefObject<HTMLDivElement | null>;
}) {
  const { locale } = controller;
  const unavailable = controller.capabilitiesQuery.isError || (!controller.capabilitiesQuery.isLoading && controller.enabledSources.length === 0);
  return <>
    <aside className="search-filter-sticky order-2 min-w-0 overflow-y-auto pb-1 lg:order-none lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:pb-5" aria-label={locale === "fr" ? "Modes de recherche par similarité IA" : "AI similarity search modes"}>
      <section className="search-filter-panel overflow-hidden border border-[var(--line-strong)] bg-[var(--background)]">
        <div className="search-filter-panel__header flex min-h-20 items-center border-b border-[var(--line)] px-4 py-3">
          <div><h2 className="text-base font-semibold text-white">{locale === "fr" ? "Recherche par similarité IA" : "AI similarity search"}</h2><p className="mt-1 text-[.65rem] text-white/55">{locale === "fr" ? "Choisissez votre méthode" : "Choose your method"}</p></div>
        </div>
        {controller.capabilitiesQuery.isLoading ? <div className="flex min-h-28 items-center justify-center"><ParigoLoader label={locale === "fr" ? "Vérification des modes" : "Checking modes"} /></div> : unavailable ? <div className="px-4 py-10 text-center"><Sparkles className="mx-auto text-[var(--text-muted)]" size={24} /><p className="mt-4 text-sm font-semibold">{locale === "fr" ? "La similarité n’est pas disponible." : "Similarity is unavailable."}</p></div> : <div className="similarity-mode-selector grid sm:grid-cols-2 lg:grid-cols-1" role="group" aria-label={locale === "fr" ? "Choisir une méthode de similarité" : "Choose a similarity method"}>{SIMILARITY_SOURCE_ORDER.filter((source) => controller.enabledSources.includes(source)).map((source) => {
          const copy = SIMILARITY_SOURCE_COPY[source];
          const Icon = copy.icon;
          const current = controller.effectiveSource === source;
          return <button key={source} type="button" aria-pressed={current} onClick={() => controller.selectSource(source)} data-current={current ? "true" : "false"} className={cn("similarity-mode-selector__item grid min-h-[4.75rem] min-w-0 grid-cols-[2rem_minmax(0,1fr)] items-center gap-3 border-b border-[var(--line)] px-4 py-3 text-left transition last:border-b-0 hover:bg-[var(--surface-soft)] focus-visible:bg-[var(--surface-soft)] sm:[&:nth-child(odd)]:border-r lg:border-r-0", current && "bg-[color-mix(in_srgb,var(--ai-search)_7%,var(--surface))] text-[var(--ai-search)] shadow-[inset_3px_0_0_color-mix(in_srgb,var(--ai-search)_74%,transparent)]")}><span className="grid h-8 w-8 place-items-center text-[var(--text-muted)]" aria-hidden="true"><Icon size={16} /></span><span className="min-w-0"><strong className="block text-sm">{locale === "fr" ? copy.fr : copy.en}</strong><small className="mt-1 block text-[.65rem] leading-4 text-[var(--text-muted)]">{locale === "fr" ? copy.detailFr : copy.detailEn}</small></span></button>;
        })}</div>}
      </section>
    </aside>

    <section className="order-3 min-w-0 lg:order-none lg:col-start-2 lg:row-start-2" aria-live="polite">
      <div ref={resultsAnchorRef} data-testid="similarity-results-anchor" aria-hidden="true" />
      {controller.capabilitiesQuery.isLoading ? <div className="flex min-h-80 items-center justify-center border border-[var(--line)]"><ParigoLoader size="page" label={locale === "fr" ? "Préparation de la similarité" : "Preparing similarity"} /></div> : unavailable ? <div className="border border-[var(--line-strong)] bg-[var(--surface)] px-5 py-20 text-center"><Sparkles className="mx-auto text-[var(--text-muted)]" size={28} /><h2 className="mt-5 text-3xl">{locale === "fr" ? "La recherche de similarité n’est pas encore ouverte." : "Similarity search is not open yet."}</h2></div> : <>
        <div className="search-results-status mb-4 flex min-w-0 items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <span>{controller.busy ? (locale === "fr" ? "Recherche…" : "Searching…") : controller.state === "done" ? `${controller.tracks.length ? 1 : 0}–${controller.tracks.length} / ${controller.total.toLocaleString(locale)}` : "0–0 / 0"}</span>
            {controller.lastCompletedSource && controller.lastCompletedSource !== controller.effectiveSource ? <span>{locale === "fr" ? "Résultats de la recherche précédente" : "Previous search results"}</span> : null}
          </div>
          {controller.tracks.length > 0 ? <Select variant="editorial" caption={locale === "fr" ? "Affichage" : "Display"} value={density} onValueChange={onDensityChange} ariaLabel={locale === "fr" ? "Niveau de détail des pistes similaires" : "Similar track detail level"} className="w-full max-w-[12rem] shrink-0" listboxClassName="search-mobile-select-listbox--right" options={[{ value: "full", label: locale === "fr" ? "Piste détaillée" : "Detailed track" }, { value: "mid", label: locale === "fr" ? "Piste compacte" : "Compact track" }, { value: "light", label: locale === "fr" ? "Piste essentielle" : "Essential track" }]} /> : null}
        </div>
        {controller.busy ? <div role="status" className="flex min-h-32 items-center justify-center border border-[var(--line)]"><ParigoLoader label={controller.state === "uploading" ? (locale === "fr" ? `Envoi du fichier — ${controller.uploadProgress} %` : `Uploading file — ${controller.uploadProgress}%`) : controller.state === "analyzing" ? (locale === "fr" ? "Analyse de la référence" : "Analysing reference") : controller.state === "preparing" ? (locale === "fr" ? "Préparation de la référence" : "Preparing reference") : (locale === "fr" ? "Classement des pistes" : "Ranking tracks")} /></div> : null}
        {controller.error ? <div role="alert" className="border border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_7%,var(--surface))] p-4 text-sm"><p>{controller.error.message}</p>{controller.error.requestId ? <p className="mt-2 font-mono text-[.62rem] opacity-65">{locale === "fr" ? "Référence" : "Reference"} : {controller.error.requestId}</p> : null}<Button variant="outline" size="sm" onClick={() => void controller.submit()} className="mt-4 !border-[var(--ai-search)] !text-[var(--ai-search)]"><RotateCcw size={14} />{locale === "fr" ? "Réessayer" : "Retry"}</Button></div> : null}
        {controller.referencesDirty ? <div role="status" className="mb-3 border border-[var(--ai-search)] bg-[color-mix(in_srgb,var(--ai-search)_6%,var(--surface))] px-4 py-3 text-sm text-[var(--foreground)]">{locale === "fr" ? "Les références ont été modifiées. Relancez la recherche pour actualiser les résultats." : "The references have changed. Run the search again to refresh the results."}</div> : null}
        {controller.state === "idle" ? <EmptyState controller={controller} /> : null}
        {controller.state === "done" ? controller.indexed === false ? <div className="border border-[var(--line)] px-5 py-20 text-center"><h2 className="text-3xl">{locale === "fr" ? "Cette piste n’est pas encore disponible dans l’index de similarité." : "This track is not yet available in the similarity index."}</h2></div> : controller.tracks.length ? <div className="search-results-ledger overflow-visible border border-[var(--line-strong)] bg-[var(--surface)]"><div className="search-results-ledger__header hidden min-h-10 items-center justify-between gap-6 border-b border-[var(--line-strong)] px-4 font-mono text-[.54rem] uppercase tracking-[.12em] text-[var(--text-muted)] xl:flex"><span>{locale === "fr" ? "Titre · album · waveform" : "Title · album · waveform"}</span><span>{locale === "fr" ? "Tags · ambiance · tempo · durée · actions" : "Tags · mood · tempo · duration · actions"}</span></div>{controller.tracks.map((track, index) => <TrackRow key={track.id} track={track} album={albumFromTrack(track)} queue={controller.tracks} index={index} displayNumber={String(index + 1)} showAlbumCover compact={density !== "full"} density={density} showCompleteActions mobileLayout="dense" />)}</div> : <div data-testid="empty-similarity-results" className="border border-[var(--line)] px-5 py-20 text-center"><h2 className="text-3xl">{locale === "fr" ? "Aucune piste similaire n’a été trouvée." : "No similar track was found."}</h2><p className="mt-3 text-sm text-[var(--text-muted)]">{controller.effectiveSource === "prompt" ? (locale === "fr" ? "Précisez l’émotion, l’instrumentation ou l’usage." : "Specify the emotion, instrumentation or use.") : controller.effectiveSource === "upload" ? (locale === "fr" ? "Essayez un extrait plus représentatif." : "Try a more representative excerpt.") : controller.effectiveSource === "url" ? (locale === "fr" ? "Vérifiez que le lien est public et toujours disponible." : "Check that the link is public and still available.") : (locale === "fr" ? "Modifiez ou réduisez les pistes de référence." : "Change or reduce the reference tracks.")}</p></div> : null}
      </>}
    </section>
  </>;
}

export function similarityInputError(value: string, locale: "fr" | "en") {
  if (!looksLikeExternalUrl(value) || detectSimilarityPlatform(value)) return "";
  return locale === "fr" ? "Ce lien ne provient pas d’une plateforme compatible." : "This link is not from a supported platform.";
}
