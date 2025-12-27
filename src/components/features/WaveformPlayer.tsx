"use client";

import { useEffect, useRef, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import { usePlayerStore } from "@/stores/player-store";
import { cn } from "@/lib/utils";

interface WaveformPlayerProps {
  className?: string;
}

export function WaveformPlayer({ className }: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const isSeekingRef = useRef(false);

  const {
    currentTrack,
    isPlaying,
    volume,
    setProgress,
    setDuration,
    next,
  } = usePlayerStore();

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current || !currentTrack) return;

    // Destroy previous instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    // Create new WaveSurfer instance
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "rgba(255, 255, 255, 0.3)",
      progressColor: "#1B9B4B",
      cursorColor: "transparent",
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 40,
      normalize: true,
      backend: "WebAudio",
    });

    wavesurferRef.current = wavesurfer;

    // Load audio
    wavesurfer.load(currentTrack.audioUrl);

    // Event handlers
    wavesurfer.on("ready", () => {
      setDuration(wavesurfer.getDuration());
      wavesurfer.setVolume(volume);
      if (isPlaying) {
        wavesurfer.play();
      }
    });

    wavesurfer.on("audioprocess", () => {
      if (!isSeekingRef.current) {
        setProgress(wavesurfer.getCurrentTime());
      }
    });

    wavesurfer.on("seeking", () => {
      isSeekingRef.current = true;
    });

    wavesurfer.on("interaction", () => {
      setProgress(wavesurfer.getCurrentTime());
      isSeekingRef.current = false;
    });

    wavesurfer.on("finish", () => {
      next();
    });

    return () => {
      wavesurfer.destroy();
    };
  }, [currentTrack?.id]);

  // Handle play/pause
  useEffect(() => {
    if (!wavesurferRef.current) return;

    if (isPlaying) {
      wavesurferRef.current.play();
    } else {
      wavesurferRef.current.pause();
    }
  }, [isPlaying]);

  // Handle volume changes
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(volume);
    }
  }, [volume]);

  if (!currentTrack) return null;

  return (
    <div
      ref={containerRef}
      className={cn("w-full cursor-pointer", className)}
    />
  );
}
