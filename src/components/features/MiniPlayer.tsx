"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Howl } from "howler";
import { usePlayerStore } from "@/stores/player-store";
import { formatDuration, cn } from "@/lib/utils";
import { mockAlbums } from "@/lib/mock-data";

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

  const howlRef = useRef<Howl | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Trouver l'album de la piste courante
  const currentAlbum = currentTrack
    ? mockAlbums.find((a) => a.id === currentTrack.albumId)
    : null;

  // Initialiser Howl quand la piste change
  useEffect(() => {
    if (!currentTrack) return;

    // Arrêter le son précédent
    if (howlRef.current) {
      howlRef.current.unload();
    }

    // Créer une nouvelle instance Howl
    howlRef.current = new Howl({
      src: [currentTrack.audioUrl],
      html5: true,
      volume: volume,
      onload: () => {
        if (howlRef.current) {
          setDuration(howlRef.current.duration());
        }
      },
      onend: () => {
        next();
      },
    });

    // Démarrer la lecture si isPlaying est true
    if (isPlaying) {
      howlRef.current.play();
    }

    return () => {
      if (howlRef.current) {
        howlRef.current.unload();
      }
    };
  }, [currentTrack?.id]);

  // Gérer play/pause
  useEffect(() => {
    if (!howlRef.current) return;

    if (isPlaying) {
      howlRef.current.play();
    } else {
      howlRef.current.pause();
    }
  }, [isPlaying]);

  // Gérer le volume
  useEffect(() => {
    if (howlRef.current) {
      howlRef.current.volume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted]);

  // Update progress
  useEffect(() => {
    if (!howlRef.current || !isPlaying) return;

    const interval = setInterval(() => {
      if (howlRef.current && !isDragging) {
        setProgress(howlRef.current.seek() as number);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, isDragging]);

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseFloat(e.target.value);
    setProgress(newProgress);
  };

  const handleProgressCommit = () => {
    if (howlRef.current) {
      howlRef.current.seek(progress);
    }
    setIsDragging(false);
  };

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

  if (!currentTrack) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-black)] text-white border-t-2 border-[var(--color-primary)]"
      >
        {/* Progress bar */}
        <div className="relative h-1 bg-white/20">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={progress}
            onChange={handleProgressChange}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={handleProgressCommit}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={handleProgressCommit}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div
            className="h-full bg-[var(--color-primary)] transition-all"
            style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
          />
        </div>

        <div className="h-[72px] px-4 flex items-center gap-4">
          {/* Track info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
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

          {/* Controls */}
          <div className="flex items-center gap-2">
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
          <div className="hidden sm:flex items-center gap-2 text-sm font-mono text-white/60">
            <span>{formatDuration(progress)}</span>
            <span>/</span>
            <span>{formatDuration(duration)}</span>
          </div>

          {/* Volume */}
          <div className="hidden md:flex items-center gap-2">
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

          {/* Close */}
          <button
            onClick={clearQueue}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
