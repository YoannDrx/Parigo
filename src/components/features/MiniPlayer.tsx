"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
  Maximize2,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import WaveSurfer from "wavesurfer.js";
import { usePlayerStore } from "@/stores/player-store";
import { cn, formatDuration } from "@/lib/utils";
import { TrackWaveform } from "./TrackWaveform";
import { useI18n } from "@/components/providers/I18nProvider";

export function MiniPlayer() {
  const { locale, t } = useI18n();
  const {
    currentTrack,
    isPlaying,
    volume,
    progress,
    duration,
    pause,
    resume,
    next,
    previous,
    setVolume,
    setProgress,
    setDuration,
    clearQueue,
  } = usePlayerStore();

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
        height: isExpanded ? 80 : 40,
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

  if (!currentTrack) return null;

  return (
    <AnimatePresence>
      <motion.div
        data-testid="player-dock"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-[60] border-t border-white/12 bg-[var(--color-black)]/95 text-white shadow-[0_-20px_60px_rgba(0,0,0,.18)] backdrop-blur-xl"
      >
        <div className="mx-auto grid max-w-[1920px] grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-3 py-2 sm:grid-cols-[220px_minmax(180px,1fr)_auto] sm:items-center sm:px-5 md:gap-x-5">
          {/* Track info */}
          <div className="flex min-w-0 items-center gap-3">
            {albumCover && (
              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-white/20 sm:h-14 sm:w-14">
                <Image
                  src={albumCover}
                  alt={albumTitle || (locale === "fr" ? "Pochette de l’album" : "Album cover")}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold sm:text-base">{currentTrack.title}</p>
              <p className="truncate text-xs text-white/55 sm:text-sm">
                {albumTitle}
              </p>
            </div>
          </div>

          <div className={cn("relative col-span-2 mt-1 min-w-0 sm:col-span-1 sm:mt-0", isExpanded ? "h-20" : "h-10")}>
            <div ref={waveformRef} className={cn("h-full w-full cursor-pointer overflow-hidden rounded-md transition-opacity", hasError && "pointer-events-none opacity-0")} />
            {(hasError || isLoading) && <div className="absolute inset-0"><TrackWaveform trackId={currentTrack.id} initialData={currentTrack.waveform} progress={progressPercent} height={isExpanded ? 80 : 40} interactive onSeek={handleStaticSeek} /></div>}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between font-mono text-[.55rem] text-white/45"><span>{formatDuration(progress)}</span><span>{formatDuration(duration)}</span></div>
          </div>

          {/* Controls */}
          <div className="row-start-1 flex flex-shrink-0 items-center justify-end gap-0.5 sm:col-start-3 sm:row-auto sm:gap-1">
            <button
              onClick={previous}
              className="hidden h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10 sm:flex"
              aria-label={locale === "fr" ? "Piste précédente" : "Previous track"}
            >
              <SkipBack size={20} />
            </button>
            <button
              onClick={() => (isPlaying ? pause() : resume())}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary)] text-black transition hover:scale-105"
              aria-label={isPlaying ? t("common.pause") : t("common.play")}
            >
              {isPlaying ? (
                <Pause size={18} className="fill-current" />
              ) : (
                <Play size={18} className="fill-current ml-0.5" />
              )}
            </button>
            <button
              onClick={next}
              className="hidden h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10 sm:flex"
              aria-label={locale === "fr" ? "Piste suivante" : "Next track"}
            >
              <SkipForward size={20} />
            </button>
          </div>

          {/* Volume */}
          <div className="hidden items-center gap-1 lg:flex">
            <button
              onClick={toggleMute}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10"
              aria-label={isMuted ? (locale === "fr" ? "Réactiver le son" : "Unmute") : (locale === "fr" ? "Couper le son" : "Mute")}
            >
              {isMuted || volume === 0 ? (
                <VolumeX size={18} />
              ) : (
                <Volume2 size={18} />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/20 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />
          </div>

          {/* Expand / Close */}
          <div className="flex flex-shrink-0 items-center gap-0.5">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="hidden rounded-full p-2 transition-colors hover:bg-white/10 sm:block"
              title={isExpanded ? (locale === "fr" ? "Réduire" : "Collapse") : (locale === "fr" ? "Agrandir" : "Expand")}
              aria-label={isExpanded ? (locale === "fr" ? "Réduire le lecteur" : "Collapse player") : (locale === "fr" ? "Agrandir le lecteur" : "Expand player")}
            >
              <Maximize2 size={18} className={isExpanded ? "rotate-180" : ""} />
            </button>
            <button
              onClick={clearQueue}
              className="rounded-full p-2 transition-colors hover:bg-white/10"
              title={t("common.close")}
              aria-label={t("common.close")}
            >
              <X size={18} />
            </button>
          </div>{hasError && <span className="sr-only" role="status"><AlertCircle size={14} />{locale === "fr" ? "Le flux audio est indisponible, la waveform reste affichée." : "Audio stream unavailable; waveform remains visible."}</span>}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
