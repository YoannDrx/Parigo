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
import { mockAlbums } from "@/lib/mock-data";
import { Waveform } from "./Waveform";

export function MiniPlayer() {
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

  // Trouver l'album de la piste courante
  const currentAlbum = currentTrack
    ? mockAlbums.find((a) => a.id === currentTrack.albumId)
    : null;

  // Progress percentage for static waveform fallback
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  // Initialiser WaveSurfer quand la piste change
  useEffect(() => {
    if (!waveformRef.current || !currentTrack) return;

    setIsReady(false);
    setHasError(false);
    setIsLoading(true);

    // Détruire l'instance précédente
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    // Créer une nouvelle instance WaveSurfer
    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "rgba(255, 255, 255, 0.3)",
      progressColor: "#1B9B4B",
      cursorColor: "#1B9B4B",
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
      console.warn("WaveSurfer error:", error);
      setHasError(true);
      setIsLoading(false);
      // Set a default duration from mock data
      setDuration(currentTrack.duration);
    });

    wavesurfer.on("audioprocess", () => {
      setProgress(wavesurfer.getCurrentTime());
    });

    wavesurfer.on("seeking", () => {
      setProgress(wavesurfer.getCurrentTime());
    });

    wavesurfer.on("finish", () => {
      next();
    });

    // Charger l'audio avec gestion d'erreur
    try {
      wavesurfer.load(currentTrack.audioUrl);
    } catch (error) {
      console.warn("Failed to load audio:", error);
      setHasError(true);
      setIsLoading(false);
      setDuration(currentTrack.duration);
    }

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
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
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        layout
        className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-black)] text-white border-t-2 border-[var(--color-primary)]"
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
                progressColor="#1B9B4B"
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
            {currentAlbum && (
              <div className="w-12 h-12 relative rounded-[var(--radius-sm)] overflow-hidden border-2 border-white/20 flex-shrink-0">
                <Image
                  src={currentAlbum.cover}
                  alt={currentAlbum.title}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-medium truncate">{currentTrack.title}</p>
              <p className="text-sm text-white/60 truncate">
                {currentAlbum?.title}
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
                  progressColor="#1B9B4B"
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
              <span>Audio non disponible</span>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={previous}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <SkipBack size={20} />
            </button>
            <button
              onClick={() => (isPlaying ? pause() : resume())}
              className="w-10 h-10 bg-[var(--color-primary)] rounded-full border-2 border-white flex items-center justify-center shadow-[3px_3px_0px_white] hover:shadow-[4px_4px_0px_white] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-[1px_1px_0px_white] active:translate-x-[1px] active:translate-y-[1px] transition-all"
            >
              {isPlaying ? (
                <Pause size={18} className="fill-white" />
              ) : (
                <Play size={18} className="fill-white ml-0.5" />
              )}
            </button>
            <button
              onClick={next}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
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
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
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
              title={isExpanded ? "Réduire" : "Agrandir"}
            >
              <Maximize2 size={18} className={isExpanded ? "rotate-180" : ""} />
            </button>
            <button
              onClick={clearQueue}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              title="Fermer"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
