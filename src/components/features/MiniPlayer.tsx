"use client";

import { useEffect, useId, useRef, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Check,
  ListPlus,
  ListMusic,
  Repeat2,
  Share2,
  Shuffle,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type WaveSurfer from "wavesurfer.js";
import { usePlayerStore } from "@/stores/player-store";
import { cn, formatBPM, formatDuration } from "@/lib/utils";
import { TrackWaveform } from "./TrackWaveform";
import { useI18n } from "@/components/providers/I18nProvider";
import { useShortlistStore } from "@/stores/shortlist-store";
import { useTrackShareStore } from "@/stores/track-share-store";
import { FavoriteButton } from "./FavoriteButton";
import { DownloadButton } from "./DownloadButton";
import { AddToPlaylistButton } from "./AddToPlaylistButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { useTouchLayout } from "@/hooks/use-touch-layout";

export function MiniPlayer() {
  const playerInstanceId = useId();
  const { locale, localizedPath, t } = useI18n();
  const {
    currentTrack,
    isPlaying,
    volume,
    progress,
    seekRevision,
    duration,
    queue,
    queueIndex,
    repeatMode,
    shuffleEnabled,
    pause,
    resume,
    next,
    previous,
    setVolume,
    setProgress,
    seekTo,
    setDuration,
    clearQueue,
    setRepeatMode,
    toggleShuffle,
  } = usePlayerStore();

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [playerView, setPlayerView] = useState<"stowed" | "docked" | "expanded">("docked");
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isTouchLayout = useTouchLayout();
  const addToShortlist = useShortlistStore((state) => state.add);
  const removeFromShortlist = useShortlistStore((state) => state.remove);
  const isShortlisted = useShortlistStore((state) => state.items.some((item) => item.track.id === currentTrack?.id));
  const isExpanded = playerView === "expanded";
  const isStowed = playerView === "stowed";

  useBodyScrollLock(isExpanded && isTouchLayout);

  // Get album info from track
  const albumCover = currentTrack?.albumCover;
  const albumTitle = currentTrack?.albumTitle;

  // Progress percentage for static waveform fallback
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  // Initialiser WaveSurfer quand la piste change
  useEffect(() => {
    if (!waveformRef.current || !currentTrack) return;

    let isMounted = true;
    let localWaveSurfer: WaveSurfer | null = null;
    const hasAudio = Boolean(currentTrack.audioUrl);
    queueMicrotask(() => {
      if (!isMounted) return;
      setIsReady(false);
      setHasError(!hasAudio);
      setIsLoading(hasAudio);
      if (!hasAudio) setDuration(currentTrack.duration);
    });
    if (wavesurferRef.current) {
      try { wavesurferRef.current.destroy(); } catch {}
      wavesurferRef.current = null;
    }
    if (!currentTrack.audioUrl) {
      return () => {
        isMounted = false;
      };
    }
    const audioUrl = currentTrack.audioUrl;
    const container = waveformRef.current;
    void import("wavesurfer.js").then(({ default: WaveSurferModule }) => {
      if (!isMounted || !container) return;
      const wavesurfer = WaveSurferModule.create({
        container,
        waveColor: "rgba(255, 255, 255, 0.3)",
        progressColor: "#6CFF67",
        cursorColor: "#6CFF67",
        cursorWidth: 2,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: isExpanded ? 80 : 40,
        normalize: true,
        interact: true,
      });
      localWaveSurfer = wavesurfer;
      wavesurferRef.current = wavesurfer;
      wavesurfer.on("ready", () => {
        if (!isMounted) return;
        setDuration(wavesurfer.getDuration());
        wavesurfer.setVolume(isMuted ? 0 : volume);
        setIsReady(true);
        setIsLoading(false);
        setHasError(false);
        if (isPlaying) void wavesurfer.play().catch(() => undefined);
      });
      wavesurfer.on("error", () => {
        if (!isMounted) return;
        setHasError(true);
        setIsLoading(false);
        setDuration(currentTrack.duration);
      });
      wavesurfer.on("audioprocess", () => { if (isMounted) setProgress(wavesurfer.getCurrentTime()); });
      wavesurfer.on("seeking", () => { if (isMounted) setProgress(wavesurfer.getCurrentTime()); });
      wavesurfer.on("finish", () => { if (isMounted) next(); });
      void wavesurfer.load(audioUrl);
    }).catch(() => {
      if (!isMounted) return;
      setHasError(true);
      setIsLoading(false);
      setDuration(currentTrack.duration);
    });

    return () => {
      isMounted = false;
      try { localWaveSurfer?.destroy(); } catch {}
      if (wavesurferRef.current === localWaveSurfer) wavesurferRef.current = null;
    };
  // The WaveSurfer instance is intentionally recreated only for a new track.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);

  // Gérer play/pause
  useEffect(() => {
    if (!wavesurferRef.current || !isReady) return;

    if (isPlaying) {
      wavesurferRef.current.play().catch(() => {
        // Ignore play errors
      });
    } else {
      wavesurferRef.current.pause();
    }
  }, [isPlaying, isReady]);

  // Gérer le volume
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted]);

  // Redimensionner le waveform quand on expand
  useEffect(() => {
    if (wavesurferRef.current && isReady) {
      wavesurferRef.current.setOptions({
        height: isExpanded ? 72 : 36,
      });
    }
  }, [isExpanded, isReady]);

  useEffect(() => {
    const wavesurfer = wavesurferRef.current;
    if (!wavesurfer || !isReady || seekRevision === 0) return;
    const requestedProgress = usePlayerStore.getState().progress;
    const waveformDuration = wavesurfer.getDuration();
    wavesurfer.setTime(Math.min(requestedProgress, waveformDuration));
  }, [currentTrack?.id, isReady, seekRevision]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (newVolume > 0) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "Escape" && isExpanded) {
        event.preventDefault();
        setPlayerView("docked");
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        if (isPlaying) pause(); else resume();
      }
      if (event.key.toLowerCase() === "n") next();
      if (event.key.toLowerCase() === "p") previous();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isExpanded, isPlaying, next, pause, previous, resume]);

  // Handle seek on static waveform
  const handleStaticSeek = useCallback((percent: number) => {
    seekTo((percent / 100) * duration);
  }, [duration, seekTo]);

  const cycleRepeat = () => {
    setRepeatMode(repeatMode === "off" ? "queue" : repeatMode === "queue" ? "track" : "off");
  };

  const openShare = useTrackShareStore((state) => state.open);
  const shareTrack = () => {
    if (!currentTrack) return;
    openShare({ trackId: currentTrack.id, title: currentTrack.title, description: currentTrack.description, albumSlug: currentTrack.albumSlug || currentTrack.albumId });
  };

  const nextTracks = queue.length > 1
    ? [...queue.slice(queueIndex + 1), ...queue.slice(0, queueIndex)].slice(0, 4)
    : [];

  const trackHref = currentTrack
    ? `${localizedPath(`/albums/${currentTrack.albumSlug || currentTrack.albumId}`)}?track=${encodeURIComponent(currentTrack.id)}`
    : localizedPath("/albums");
  const labelHref = currentTrack?.albumLabelSlug
    ? localizedPath(`/labels/${currentTrack.albumLabelSlug}`)
    : null;

  if (!currentTrack) return null;

  return (
    <AnimatePresence>
      {isExpanded && isTouchLayout ? (
        <motion.button
          key="mobile-player-backdrop"
          type="button"
          aria-label={locale === "fr" ? "Fermer le panneau du lecteur" : "Close player panel"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: .22 }}
          onClick={() => setPlayerView("docked")}
          className="fixed inset-0 z-[55] cursor-default bg-black/38 backdrop-blur-[1px] motion-reduce:transition-none"
        />
      ) : null}
      <motion.aside
        data-testid="player-dock"
        data-player-instance={playerInstanceId}
        data-player-state={playerView}
        data-playing={isPlaying ? "true" : "false"}
        aria-label={locale === "fr" ? "Lecteur audio persistant" : "Persistent audio player"}
        initial={{ y: 120, opacity: 0, scale: .98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 120, opacity: 0, scale: .98 }}
        transition={{ duration: .42, ease: [.22, 1, .36, 1] }}
        className={cn(
          "parigo-player fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-[1560px] overflow-hidden border border-white/18 bg-[#101410]/96 text-white shadow-[0_28px_90px_rgba(0,0,0,.34)] backdrop-blur-2xl md:inset-x-5 md:bottom-5",
          isExpanded && "parigo-player--expanded",
          isStowed && "parigo-player--stowed !left-auto !right-3 !w-16 !max-w-16 !overflow-visible !mx-0 md:!right-5",
        )}
      >
        {isStowed ? <div className="parigo-player__stowed flex w-16 flex-col">
          <div className="parigo-player__stowed-cover relative h-16 w-16 overflow-hidden bg-[#101410]">
            {albumCover ? <Image src={albumCover} alt="" fill sizes="64px" className="object-cover opacity-72" /> : <span className="absolute inset-0 grid place-items-center"><ListMusic size={20} className="text-white/68" /></span>}
            <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(145deg,rgba(8,10,8,.04),rgba(8,10,8,.68))]" />
            <Tooltip label={isPlaying ? t("common.pause") : t("common.play")}><button type="button" onClick={() => (isPlaying ? pause() : resume())} className="absolute inset-0 m-auto grid h-9 w-9 place-items-center bg-[var(--signal)] text-[#0c120d] shadow-[0_0_0_4px_rgba(8,10,8,.45)] transition hover:scale-105 hover:bg-white" aria-label={isPlaying ? t("common.pause") : t("common.play")}>
              {isLoading ? <ParigoLoader size="icon" label={locale === "fr" ? "Chargement de la piste" : "Loading track"} /> : isPlaying ? <Pause size={15} className="fill-current" /> : <Play size={15} className="ml-0.5 fill-current" />}
            </button></Tooltip>
            <Tooltip label={locale === "fr" ? "Déployer le lecteur" : "Restore player"}><button type="button" onClick={() => setPlayerView("docked")} className="absolute right-0 top-0 grid h-6 w-6 place-items-center bg-black/72 text-white/82 transition hover:bg-white hover:text-black" aria-label={locale === "fr" ? "Déployer le lecteur" : "Restore player"}><Maximize2 size={11} /></button></Tooltip>
          </div>
          <span aria-hidden="true" className="mt-[3px] block h-[2px] w-full overflow-hidden bg-[color-mix(in_srgb,var(--foreground)_18%,transparent)]"><span className="block h-full bg-[var(--signal-strong)]" style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }} /></span>
        </div> : null}
        <div className={cn("parigo-player__standard relative", isStowed && "pointer-events-none invisible absolute bottom-0 right-0 w-[min(calc(100vw-1.5rem),1560px)] md:w-[min(calc(100vw-2.5rem),1560px)]")}>
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(100deg,rgba(60,156,97,.24)_0%,rgba(16,20,16,.96)_23%,rgba(8,10,8,.99)_100%),linear-gradient(115deg,transparent_0%,rgba(255,255,255,.035)_48%,transparent_48.2%)]" />
        <div className="parigo-player__main relative grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 px-3 py-3 sm:px-4 md:grid-cols-[minmax(210px,.8fr)_auto_minmax(300px,1.45fr)_auto] md:gap-x-5 md:px-5">
          <div className="flex min-w-0 items-center gap-3 md:pr-2">
            <div className="parigo-player__art relative h-12 w-12 flex-shrink-0 overflow-hidden border border-white/16 bg-white/6 sm:h-14 sm:w-14">
              {albumCover ? (
                <Image
                  src={albumCover}
                  alt={albumTitle || (locale === "fr" ? "Pochette de l’album" : "Album cover")}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              ) : <span className="flex h-full w-full items-center justify-center"><ListMusic size={18} className="text-white/68" /></span>}
              {isPlaying && <span aria-hidden="true" className="absolute bottom-1.5 right-1.5 flex h-4 items-end gap-[2px] rounded-sm bg-black/70 p-1"><i className="h-1 w-[2px] animate-pulse bg-[var(--signal)]" /><i className="h-2 w-[2px] animate-pulse bg-[var(--signal)] [animation-delay:120ms]" /><i className="h-1.5 w-[2px] animate-pulse bg-[var(--signal)] [animation-delay:240ms]" /></span>}
            </div>
            <div className="min-w-0">
              <p className="mb-1 font-mono text-[.5rem] uppercase tracking-[.13em] text-[var(--signal)]">{locale === "fr" ? "À l’écoute" : "Now playing"}</p>
              <Link href={trackHref} className="parigo-player__metadata-link block truncate text-sm font-semibold leading-tight text-white transition sm:text-base" aria-label={`${locale === "fr" ? "Ouvrir la piste" : "Open track"} ${currentTrack.title}`}>{currentTrack.title}</Link>
              <div className="mt-1 flex min-w-0 items-center gap-2 truncate text-[.68rem] text-white/72 sm:text-xs">
                <span className="min-w-0 truncate">{currentTrack.artists?.map((artist) => artist.name).join(", ") || albumTitle}</span>
                {currentTrack.albumLabel ? <><span aria-hidden="true" className="shrink-0 text-white/32">·</span>{labelHref ? <Link href={labelHref} className="parigo-player__metadata-link shrink-0 font-medium text-white/82 transition" aria-label={`${locale === "fr" ? "Ouvrir le label" : "Open label"} ${currentTrack.albumLabel}`}>{currentTrack.albumLabel}</Link> : <span className="shrink-0 font-medium text-white/82">{currentTrack.albumLabel}</span>}</> : null}
              </div>
              <p className="mt-1 hidden truncate font-mono text-[.5rem] uppercase tracking-[.1em] text-white/54 lg:block">{currentTrack.cdCode || albumTitle || "PARIGO"} · {currentTrack.version || (locale === "fr" ? "Version principale" : "Main version")}{currentTrack.bpm ? ` · ${formatBPM(currentTrack.bpm)}` : ""}</p>
            </div>
          </div>

          <div className="parigo-player__transport flex items-center justify-end gap-0.5 md:justify-center md:gap-1">
            <Tooltip label={locale === "fr" ? "Piste précédente" : "Previous track"} className="hidden sm:inline-flex"><button onClick={previous} className="flex h-10 w-10 items-center justify-center rounded-full text-white/68 transition hover:bg-white/9 hover:text-white" aria-label={locale === "fr" ? "Piste précédente" : "Previous track"}><SkipBack size={17} /></button></Tooltip>
            <Tooltip label={isPlaying ? t("common.pause") : t("common.play")}><button onClick={() => (isPlaying ? pause() : resume())} className="parigo-player__play flex h-12 w-12 items-center justify-center bg-[var(--signal)] text-[#0c120d] shadow-[0_0_0_5px_rgba(92,190,116,.12)] transition duration-300 hover:scale-105 hover:bg-white" aria-label={isPlaying ? t("common.pause") : t("common.play")}>
              {isLoading
                ? <ParigoLoader size="icon" label={locale === "fr" ? "Chargement de la piste" : "Loading track"} />
                : isPlaying
                  ? <Pause size={18} className="fill-current" />
                  : <Play size={18} className="ml-0.5 fill-current" />}
            </button></Tooltip>
            <Tooltip label={locale === "fr" ? "Piste suivante" : "Next track"} className="hidden sm:inline-flex"><button onClick={next} className="flex h-10 w-10 items-center justify-center rounded-full text-white/68 transition hover:bg-white/9 hover:text-white" aria-label={locale === "fr" ? "Piste suivante" : "Next track"}><SkipForward size={17} /></button></Tooltip>
          </div>

          <div className="flex items-center justify-end md:order-4">
            <div className="mr-1 hidden items-center gap-0.5 xl:flex">
              <FavoriteButton type="track" itemId={currentTrack.id} size="md" className="!h-10 !w-10 !border-0 !bg-transparent !text-white/74 hover:!bg-white/9 hover:!text-white hover:!shadow-none" />
              <AddToPlaylistButton trackId={currentTrack.id} trackTitle={currentTrack.title} className="rounded-full !text-white/74 hover:!bg-white/9 [&_svg]:!text-current" />
              <DownloadButton trackId={currentTrack.id} trackTitle={currentTrack.title} className="rounded-full !text-white/74 hover:!bg-white/9 [&_svg]:!text-current" />
              <Tooltip label={isShortlisted ? t("search.removeShortlist") : t("search.addShortlist")}><button type="button" onClick={() => isShortlisted ? removeFromShortlist(currentTrack.id) : addToShortlist(currentTrack)} aria-pressed={isShortlisted} className={cn("flex h-10 w-10 items-center justify-center rounded-full transition", isShortlisted ? "bg-[var(--signal)] text-[#0c120d]" : "text-white/74 hover:bg-white/9 hover:text-white")} aria-label={`${isShortlisted ? t("search.removeShortlist") : t("search.addShortlist")} : ${currentTrack.title}`}>{isShortlisted ? <Check size={16} /> : <ListPlus size={16} />}</button></Tooltip>
              <Tooltip label={locale === "fr" ? "Partager" : "Share"}><button type="button" onClick={shareTrack} className="flex h-10 w-10 items-center justify-center rounded-full text-white/74 transition hover:bg-white/9 hover:text-white" aria-label={`${locale === "fr" ? "Partager" : "Share"} : ${currentTrack.title}`}><Share2 size={16} /></button></Tooltip>
            </div>
            <Tooltip label={locale === "fr" ? "Ranger le lecteur" : "Stow player"}><button type="button" onClick={() => setPlayerView("stowed")} className="flex h-10 w-10 items-center justify-center rounded-full text-white/78 transition hover:bg-white/9 hover:text-white" aria-label={locale === "fr" ? "Ranger le lecteur" : "Stow player"}><Minimize2 size={16} /></button></Tooltip>
            <Tooltip label={isExpanded ? (locale === "fr" ? "Réduire le lecteur" : "Collapse player") : (locale === "fr" ? "Détails de la piste" : "Track details")}><button type="button" onClick={() => setPlayerView(isExpanded ? "docked" : "expanded")} className="flex h-10 w-10 items-center justify-center rounded-full text-white/78 transition hover:bg-white/9 hover:text-white" aria-expanded={isExpanded} aria-label={isExpanded ? (locale === "fr" ? "Réduire le lecteur" : "Collapse player") : (locale === "fr" ? "Agrandir le lecteur" : "Expand player")}>{isExpanded ? <ChevronDown size={17} /> : <ChevronUp size={17} />}</button></Tooltip>
            <Tooltip label={t("common.close")}><button onClick={clearQueue} className="flex h-10 w-9 items-center justify-center rounded-full text-white/68 transition hover:bg-white/9 hover:text-white" aria-label={t("common.close")}><X size={16} /></button></Tooltip>
          </div>

          <div className={cn("relative col-span-3 mt-2 min-w-0 md:order-3 md:col-span-1 md:mt-0", isExpanded ? "h-[72px]" : "h-9")}>
            <div ref={waveformRef} data-testid="player-waveform" className={cn("parigo-player__wave h-full w-full cursor-pointer overflow-hidden transition-opacity", hasError && "pointer-events-none opacity-0")} />
            {(hasError || isLoading) && <div className="absolute inset-0"><TrackWaveform trackId={currentTrack.id} initialData={currentTrack.waveform} progress={progressPercent} height={isExpanded ? 72 : 36} interactive onSeek={handleStaticSeek} ariaLabel={`${locale === "fr" ? "Position de lecture du player" : "Player playback position"} : ${currentTrack.title}`} /></div>}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between font-mono text-[.5rem] text-white/62"><span data-testid="player-time-current">{formatDuration(progress)}</span><span>{formatDuration(duration)}</span></div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .32, ease: [.22, 1, .36, 1] }} className="parigo-player__expanded relative overflow-y-auto overscroll-contain border-t border-white/10">
            <div className="grid gap-5 px-4 py-4 sm:grid-cols-[auto_1fr] md:px-6">
              <div className="flex items-center gap-1 sm:flex-col sm:items-stretch sm:border-r sm:border-white/10 sm:pr-5 lg:flex-row lg:border-r-0 lg:pr-0">
                <div className="flex items-center gap-0.5 xl:hidden">
                  <FavoriteButton type="track" itemId={currentTrack.id} size="md" className="!h-10 !w-10 !border-0 !bg-transparent !text-white/74 hover:!bg-white/9 hover:!text-white hover:!shadow-none" />
                  <AddToPlaylistButton trackId={currentTrack.id} trackTitle={currentTrack.title} className="rounded-full !text-white/74 hover:!bg-white/9 [&_svg]:!text-current" />
                  <DownloadButton trackId={currentTrack.id} trackTitle={currentTrack.title} className="rounded-full !text-white/74 hover:!bg-white/9 [&_svg]:!text-current" />
                  <Tooltip label={isShortlisted ? t("search.removeShortlist") : t("search.addShortlist")}><button type="button" onClick={() => isShortlisted ? removeFromShortlist(currentTrack.id) : addToShortlist(currentTrack)} aria-pressed={isShortlisted} className={cn("flex h-10 w-10 items-center justify-center rounded-full transition", isShortlisted ? "bg-[var(--signal)] text-[#0c120d]" : "text-white/74 hover:bg-white/9 hover:text-white")} aria-label={`${isShortlisted ? t("search.removeShortlist") : t("search.addShortlist")} : ${currentTrack.title}`}>{isShortlisted ? <Check size={16} /> : <ListPlus size={16} />}</button></Tooltip>
                  <Tooltip label={locale === "fr" ? "Partager" : "Share"}><button type="button" onClick={shareTrack} className="flex h-10 w-10 items-center justify-center rounded-full text-white/74 transition hover:bg-white/9 hover:text-white" aria-label={`${locale === "fr" ? "Partager" : "Share"} : ${currentTrack.title}`}><Share2 size={16} /></button></Tooltip>
                </div>
                <Tooltip label={locale === "fr" ? "Lecture aléatoire" : "Shuffle"}><button onClick={toggleShuffle} aria-pressed={shuffleEnabled} className={cn("flex h-10 min-w-10 items-center justify-center gap-2 rounded-full px-3 text-xs transition hover:bg-white/9", shuffleEnabled ? "bg-[var(--signal)] text-[#0c120d]" : "text-white/74")} aria-label={locale === "fr" ? "Lecture aléatoire" : "Shuffle"}><Shuffle size={15} /><span className="hidden lg:inline">{locale === "fr" ? "Aléatoire" : "Shuffle"}</span></button></Tooltip>
                <Tooltip label={locale === "fr" ? `Répétition : ${repeatMode}` : `Repeat: ${repeatMode}`}><button onClick={cycleRepeat} className={cn("flex h-10 min-w-10 items-center justify-center gap-2 rounded-full px-3 text-xs transition hover:bg-white/9", repeatMode !== "off" ? "text-[var(--signal)]" : "text-white/74")} aria-label={locale === "fr" ? `Répétition : ${repeatMode}` : `Repeat: ${repeatMode}`}><Repeat2 size={15} /><span className="hidden lg:inline">{repeatMode === "track" ? "1" : repeatMode === "queue" ? (locale === "fr" ? "File" : "Queue") : "Off"}</span></button></Tooltip>
                <div className="hidden items-center gap-1 lg:flex"><Tooltip label={isMuted ? (locale === "fr" ? "Réactiver le son" : "Unmute") : (locale === "fr" ? "Couper le son" : "Mute")}><button onClick={toggleMute} className="flex h-10 w-10 items-center justify-center rounded-full text-white/74 transition hover:bg-white/9 hover:text-white" aria-label={isMuted ? (locale === "fr" ? "Réactiver le son" : "Unmute") : (locale === "fr" ? "Couper le son" : "Mute")}>{isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}</button></Tooltip><input type="range" min={0} max={1} step={0.01} value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/20 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--signal)]" /></div>
              </div>
              <div className="min-w-0">
                <div className="mb-3 flex items-center justify-between"><p className="font-mono text-[.55rem] uppercase tracking-[.13em] text-white/62">{locale === "fr" ? "À suivre" : "Up next"} · {Math.max(0, queue.length - 1)}</p>{hasError && <span className="flex items-center gap-1.5 text-[.62rem] text-amber-200/70" role="status"><AlertCircle size={13} />{locale === "fr" ? "Waveform de secours" : "Fallback waveform"}</span>}</div>
                {nextTracks.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{nextTracks.map((track, index) => <div key={`${track.id}-${index}`} className="parigo-player__queue-card flex min-w-0 items-center gap-3 border border-white/12 bg-white/[.035] p-2.5"><span className="font-mono text-[.52rem] text-[var(--signal)]">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{track.title}</p><p className="mt-1 truncate text-[.6rem] text-white/62">{track.albumTitle}</p></div></div>)}</div> : <p className="text-xs text-white/62">{locale === "fr" ? "Aucune autre piste dans la file." : "No other tracks in the queue."}</p>}
              </div>
            </div>
          </motion.div>}
        </AnimatePresence>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
