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
import { formatDuration } from "@/lib/utils";
import { Waveform } from "./Waveform";
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      // Set a default duration from mock data
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
        layout
        className="fixed bottom-0 left-0 right-0 z-[60] border-t border-white/12 bg-[var(--color-black)]/95 text-white shadow-[0_-20px_60px_rgba(0,0,0,.18)] backdrop-blur-xl"
      >
        {/* Expanded Waveform */}
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pt-4"
          >
            {hasError ? (
              // Fallback to static waveform
              <Waveform
                data={currentTrack.waveform}
                progress={progressPercent}
                height={80}
                waveColor="rgba(255, 255, 255, 0.3)"
                progressColor="#6CFF67"
                interactive
                onSeek={handleStaticSeek}
              />
            ) : (
              <div
                ref={isExpanded ? waveformRef : undefined}
                className="w-full cursor-pointer rounded-lg overflow-hidden"
              />
            )}
          </motion.div>
        )}

        <div className={`${isExpanded ? "h-20" : "h-[72px]"} px-4 flex items-center gap-4`}>
          {/* Track info */}
          <div className="flex items-center gap-3 min-w-0 w-48 flex-shrink-0">
            {albumCover && (
              <div className="w-12 h-12 relative rounded-[var(--radius-sm)] overflow-hidden border-2 border-white/20 flex-shrink-0">
                <Image
                  src={albumCover}
                  alt={albumTitle || (locale === "fr" ? "Pochette de l’album" : "Album cover")}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-medium truncate">{currentTrack.title}</p>
              <p className="text-sm text-white/60 truncate">
                {albumTitle}
              </p>
            </div>
          </div>

          {/* Mini Waveform (when not expanded) */}
          {!isExpanded && (
            <div className="flex-1 hidden sm:block">
              {hasError || isLoading ? (
                // Fallback to static waveform
                <Waveform
                  data={currentTrack.waveform}
                  progress={progressPercent}
                  height={40}
                  waveColor="rgba(255, 255, 255, 0.3)"
                  progressColor="#6CFF67"
                  interactive
                  onSeek={handleStaticSeek}
                />
              ) : (
                <div
                  ref={!isExpanded ? waveformRef : undefined}
                  className="w-full cursor-pointer"
                />
              )}
            </div>
          )}

          {/* Error indicator */}
          {hasError && (
            <div className="hidden sm:flex items-center gap-1 text-yellow-400 text-xs flex-shrink-0">
              <AlertCircle size={14} />
              <span>{locale === "fr" ? "Audio non disponible" : "Audio unavailable"}</span>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={previous}
              className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
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
              className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label={locale === "fr" ? "Piste suivante" : "Next track"}
            >
              <SkipForward size={20} />
            </button>
          </div>

          {/* Time */}
          <div className="hidden md:flex items-center gap-2 text-sm font-mono text-white/60 flex-shrink-0 w-24">
            <span>{formatDuration(progress)}</span>
            <span>/</span>
            <span>{formatDuration(duration)}</span>
          </div>

          {/* Volume */}
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            <button
              onClick={toggleMute}
              className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
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
              className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>

          {/* Expand / Close */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors hidden sm:block"
              title={isExpanded ? (locale === "fr" ? "Réduire" : "Collapse") : (locale === "fr" ? "Agrandir" : "Expand")}
              aria-label={isExpanded ? (locale === "fr" ? "Réduire le lecteur" : "Collapse player") : (locale === "fr" ? "Agrandir le lecteur" : "Expand player")}
            >
              <Maximize2 size={18} className={isExpanded ? "rotate-180" : ""} />
            </button>
            <button
              onClick={clearQueue}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              title={t("common.close")}
              aria-label={t("common.close")}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
