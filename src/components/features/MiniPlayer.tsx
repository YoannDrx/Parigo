"use client";

import { useEffect, useId, useRef, useState, useCallback } from "react";
import Image from "next/image";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import WaveSurfer from "wavesurfer.js";
import { usePlayerStore } from "@/stores/player-store";
import { cn, formatBPM, formatDuration } from "@/lib/utils";
import { TrackWaveform } from "./TrackWaveform";
import { useI18n } from "@/components/providers/I18nProvider";
import { useShortlistStore } from "@/stores/shortlist-store";
import { FavoriteButton } from "./FavoriteButton";
import { DownloadButton } from "./DownloadButton";
import { AddToPlaylistButton } from "./AddToPlaylistButton";
import { Tooltip } from "@/components/ui";

export function MiniPlayer() {
  const playerInstanceId = useId();
  const { locale, t } = useI18n();
  const {
    currentTrack,
    isPlaying,
    volume,
    progress,
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
    setDuration,
    clearQueue,
    setRepeatMode,
    toggleShuffle,
  } = usePlayerStore();

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const addToShortlist = useShortlistStore((state) => state.add);
  const removeFromShortlist = useShortlistStore((state) => state.remove);
  const isShortlisted = useShortlistStore((state) => state.items.some((item) => item.track.id === currentTrack?.id));

  // Get album info from track
  const albumCover = currentTrack?.albumCover;
  const albumTitle = currentTrack?.albumTitle;

  // Progress percentage for static waveform fallback
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  // Initialiser WaveSurfer quand la piste change
  useEffect(() => {
    if (!waveformRef.current || !currentTrack) return;

    let isMounted = true;

    // Reset the local adapter state whenever WaveSurfer is recreated.
    setIsReady(false);
    setHasError(false);
    setIsLoading(true);

    // Détruire l'instance précédente
    if (wavesurferRef.current) {
      try {
        wavesurferRef.current.destroy();
      } catch {
        // Ignore destroy errors
      }
      wavesurferRef.current = null;
    }

    // Créer une nouvelle instance WaveSurfer
    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
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

    wavesurferRef.current = wavesurfer;

    // Event handlers
    wavesurfer.on("ready", () => {
      if (!isMounted) return;
      setDuration(wavesurfer.getDuration());
      wavesurfer.setVolume(isMuted ? 0 : volume);
      setIsReady(true);
      setIsLoading(false);
      setHasError(false);
      if (isPlaying) {
        wavesurfer.play().catch(() => {
          // Ignore play errors (user interaction required)
        });
      }
    });

    wavesurfer.on("error", (error) => {
      if (!isMounted) return;
      console.warn("WaveSurfer error:", error);
      setHasError(true);
      setIsLoading(false);
      // Keep the metadata duration until the media element reports its value.
      setDuration(currentTrack.duration);
    });

    wavesurfer.on("audioprocess", () => {
      if (!isMounted) return;
      setProgress(wavesurfer.getCurrentTime());
    });

    wavesurfer.on("seeking", () => {
      if (!isMounted) return;
      setProgress(wavesurfer.getCurrentTime());
    });

    wavesurfer.on("finish", () => {
      if (!isMounted) return;
      next();
    });

    // Charger l'audio avec gestion d'erreur
    if (!currentTrack.audioUrl) {
      // No audio URL available
      setHasError(true);
      setIsLoading(false);
      setDuration(currentTrack.duration);
      return;
    }

    try {
      wavesurfer.load(currentTrack.audioUrl);
    } catch (error) {
      console.warn("Failed to load audio:", error);
      if (isMounted) {
        setHasError(true);
        setIsLoading(false);
        setDuration(currentTrack.duration);
      }
    }

    return () => {
      isMounted = false;
      if (wavesurferRef.current) {
        try {
          wavesurferRef.current.destroy();
        } catch {
          // Ignore AbortError during cleanup
        }
        wavesurferRef.current = null;
      }
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
      if (event.code === "Space") {
        event.preventDefault();
        if (isPlaying) pause(); else resume();
      }
      if (event.key.toLowerCase() === "n") next();
      if (event.key.toLowerCase() === "p") previous();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPlaying, next, pause, previous, resume]);

  // Handle seek on static waveform
  const handleStaticSeek = useCallback((percent: number) => {
    const newProgress = (percent / 100) * duration;
    setProgress(newProgress);
    if (wavesurferRef.current && isReady) {
      wavesurferRef.current.seekTo(percent / 100);
    }
  }, [duration, isReady, setProgress]);

  const cycleRepeat = () => {
    setRepeatMode(repeatMode === "off" ? "queue" : repeatMode === "queue" ? "track" : "off");
  };

  const shareTrack = async () => {
    if (!currentTrack) return;
    const url = `${window.location.origin}/albums/${currentTrack.albumSlug || currentTrack.albumId}?track=${encodeURIComponent(currentTrack.id)}`;
    if (navigator.share) await navigator.share({ title: currentTrack.title, text: currentTrack.description, url }).catch(() => undefined);
    else await navigator.clipboard.writeText(url);
  };

  const nextTracks = queue.length > 1
    ? [...queue.slice(queueIndex + 1), ...queue.slice(0, queueIndex)].slice(0, 4)
    : [];

  if (!currentTrack) return null;

  return (
    <AnimatePresence>
      <motion.aside
        data-testid="player-dock"
        data-player-instance={playerInstanceId}
        aria-label={locale === "fr" ? "Lecteur audio persistant" : "Persistent audio player"}
        initial={{ y: 120, opacity: 0, scale: .98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 120, opacity: 0, scale: .98 }}
        transition={{ duration: .42, ease: [.22, 1, .36, 1] }}
        className="parigo-player fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-[1560px] overflow-hidden border border-white/18 bg-[#101410]/96 text-white shadow-[0_28px_90px_rgba(0,0,0,.34)] backdrop-blur-2xl md:inset-x-5 md:bottom-5"
      >
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(100deg,rgba(60,156,97,.24)_0%,rgba(16,20,16,.96)_23%,rgba(8,10,8,.99)_100%),linear-gradient(115deg,transparent_0%,rgba(255,255,255,.035)_48%,transparent_48.2%)]" />
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 px-3 py-3 sm:px-4 md:grid-cols-[minmax(210px,.8fr)_auto_minmax(300px,1.45fr)_auto] md:gap-x-5 md:px-5">
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
              <p className="truncate text-sm font-semibold leading-tight text-white sm:text-base">{currentTrack.title}</p>
              <p className="mt-1 truncate text-[.68rem] text-white/72 sm:text-xs">{currentTrack.artists?.map((artist) => artist.name).join(", ") || albumTitle}</p>
              <p className="mt-1 hidden truncate font-mono text-[.5rem] uppercase tracking-[.1em] text-white/54 lg:block">{currentTrack.cdCode || albumTitle || "PARIGO"} · {currentTrack.version || (locale === "fr" ? "Version principale" : "Main version")}{currentTrack.bpm ? ` · ${formatBPM(currentTrack.bpm)}` : ""}</p>
            </div>
          </div>

          <div className="parigo-player__transport flex items-center justify-end gap-0.5 md:justify-center md:gap-1">
            <Tooltip label={locale === "fr" ? "Piste précédente" : "Previous track"} className="hidden sm:inline-flex"><button onClick={previous} className="flex h-10 w-10 items-center justify-center rounded-full text-white/68 transition hover:bg-white/9 hover:text-white" aria-label={locale === "fr" ? "Piste précédente" : "Previous track"}><SkipBack size={17} /></button></Tooltip>
            <Tooltip label={isPlaying ? t("common.pause") : t("common.play")}><button onClick={() => (isPlaying ? pause() : resume())} className="parigo-player__play flex h-12 w-12 items-center justify-center bg-[var(--signal)] text-[#0c120d] shadow-[0_0_0_5px_rgba(92,190,116,.12)] transition duration-300 hover:scale-105 hover:bg-white" aria-label={isPlaying ? t("common.pause") : t("common.play")}>
              {isPlaying ? <Pause size={18} className="fill-current" /> : <Play size={18} className="ml-0.5 fill-current" />}
            </button></Tooltip>
            <Tooltip label={locale === "fr" ? "Piste suivante" : "Next track"} className="hidden sm:inline-flex"><button onClick={next} className="flex h-10 w-10 items-center justify-center rounded-full text-white/68 transition hover:bg-white/9 hover:text-white" aria-label={locale === "fr" ? "Piste suivante" : "Next track"}><SkipForward size={17} /></button></Tooltip>
          </div>

          <div className="flex items-center justify-end md:order-4">
            <div className="mr-1 hidden items-center gap-0.5 xl:flex">
              <FavoriteButton type="track" itemId={currentTrack.id} size="md" className="!h-10 !w-10 !border-0 !bg-transparent !text-white/74 hover:!bg-white/9 hover:!text-white hover:!shadow-none" />
              <AddToPlaylistButton trackId={currentTrack.id} trackTitle={currentTrack.title} className="rounded-full !text-white/74 hover:!bg-white/9 [&_svg]:!text-current" />
              <DownloadButton trackId={currentTrack.id} trackTitle={currentTrack.title} className="rounded-full !text-white/74 hover:!bg-white/9 [&_svg]:!text-current" />
              <Tooltip label={isShortlisted ? t("search.removeShortlist") : t("search.addShortlist")}><button type="button" onClick={() => isShortlisted ? removeFromShortlist(currentTrack.id) : addToShortlist(currentTrack)} aria-pressed={isShortlisted} className={cn("flex h-10 w-10 items-center justify-center rounded-full transition", isShortlisted ? "bg-[var(--signal)] text-[#0c120d]" : "text-white/74 hover:bg-white/9 hover:text-white")} aria-label={`${isShortlisted ? t("search.removeShortlist") : t("search.addShortlist")} : ${currentTrack.title}`}>{isShortlisted ? <Check size={16} /> : <ListPlus size={16} />}</button></Tooltip>
              <Tooltip label={locale === "fr" ? "Partager" : "Share"}><button type="button" onClick={() => void shareTrack()} className="flex h-10 w-10 items-center justify-center rounded-full text-white/74 transition hover:bg-white/9 hover:text-white" aria-label={`${locale === "fr" ? "Partager" : "Share"} : ${currentTrack.title}`}><Share2 size={16} /></button></Tooltip>
            </div>
            <Tooltip label={isExpanded ? (locale === "fr" ? "Réduire le lecteur" : "Collapse player") : (locale === "fr" ? "Détails de la piste" : "Track details")}><button onClick={() => setIsExpanded(!isExpanded)} className="flex h-10 w-10 items-center justify-center rounded-full text-white/78 transition hover:bg-white/9 hover:text-white" aria-expanded={isExpanded} aria-label={isExpanded ? (locale === "fr" ? "Réduire le lecteur" : "Collapse player") : (locale === "fr" ? "Agrandir le lecteur" : "Expand player")}>{isExpanded ? <ChevronDown size={17} /> : <ChevronUp size={17} />}</button></Tooltip>
            <Tooltip label={t("common.close")}><button onClick={clearQueue} className="flex h-10 w-9 items-center justify-center rounded-full text-white/68 transition hover:bg-white/9 hover:text-white" aria-label={t("common.close")}><X size={16} /></button></Tooltip>
          </div>

          <div className={cn("relative col-span-3 mt-2 min-w-0 md:order-3 md:col-span-1 md:mt-0", isExpanded ? "h-[72px]" : "h-9")}>
            <div ref={waveformRef} data-testid="player-waveform" className={cn("parigo-player__wave h-full w-full cursor-pointer overflow-hidden transition-opacity", hasError && "pointer-events-none opacity-0")} />
            {(hasError || isLoading) && <div className="absolute inset-0"><TrackWaveform trackId={currentTrack.id} initialData={currentTrack.waveform} progress={progressPercent} height={isExpanded ? 72 : 36} interactive onSeek={handleStaticSeek} /></div>}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between font-mono text-[.5rem] text-white/62"><span data-testid="player-time-current">{formatDuration(progress)}</span><span>{formatDuration(duration)}</span></div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .32, ease: [.22, 1, .36, 1] }} className="parigo-player__expanded relative overflow-hidden border-t border-white/10">
            <div className="grid gap-5 px-4 py-4 sm:grid-cols-[auto_1fr] md:px-6">
              <div className="flex items-center gap-1 sm:flex-col sm:items-stretch sm:border-r sm:border-white/10 sm:pr-5 lg:flex-row lg:border-r-0 lg:pr-0">
                <div className="flex items-center gap-0.5 xl:hidden">
                  <FavoriteButton type="track" itemId={currentTrack.id} size="md" className="!h-10 !w-10 !border-0 !bg-transparent !text-white/74 hover:!bg-white/9 hover:!text-white hover:!shadow-none" />
                  <AddToPlaylistButton trackId={currentTrack.id} trackTitle={currentTrack.title} className="rounded-full !text-white/74 hover:!bg-white/9 [&_svg]:!text-current" />
                  <DownloadButton trackId={currentTrack.id} trackTitle={currentTrack.title} className="rounded-full !text-white/74 hover:!bg-white/9 [&_svg]:!text-current" />
                  <Tooltip label={isShortlisted ? t("search.removeShortlist") : t("search.addShortlist")}><button type="button" onClick={() => isShortlisted ? removeFromShortlist(currentTrack.id) : addToShortlist(currentTrack)} aria-pressed={isShortlisted} className={cn("flex h-10 w-10 items-center justify-center rounded-full transition", isShortlisted ? "bg-[var(--signal)] text-[#0c120d]" : "text-white/74 hover:bg-white/9 hover:text-white")} aria-label={`${isShortlisted ? t("search.removeShortlist") : t("search.addShortlist")} : ${currentTrack.title}`}>{isShortlisted ? <Check size={16} /> : <ListPlus size={16} />}</button></Tooltip>
                  <Tooltip label={locale === "fr" ? "Partager" : "Share"}><button type="button" onClick={() => void shareTrack()} className="flex h-10 w-10 items-center justify-center rounded-full text-white/74 transition hover:bg-white/9 hover:text-white" aria-label={`${locale === "fr" ? "Partager" : "Share"} : ${currentTrack.title}`}><Share2 size={16} /></button></Tooltip>
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
      </motion.aside>
    </AnimatePresence>
  );
}
