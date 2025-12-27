"use client";

import { useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

interface WaveformProps {
  /** Array of amplitude values (0-1) */
  data: number[];
  /** Progress percentage (0-100) */
  progress?: number;
  /** Height of the waveform in pixels */
  height?: number;
  /** Color of the waveform (unplayed portion) */
  waveColor?: string;
  /** Color of the played portion */
  progressColor?: string;
  /** Whether the waveform is interactive */
  interactive?: boolean;
  /** Callback when user seeks */
  onSeek?: (progress: number) => void;
  /** Additional class names */
  className?: string;
}

export function Waveform({
  data,
  progress = 0,
  height = 40,
  waveColor = "var(--color-gray-400)",
  progressColor = "var(--color-primary)",
  interactive = false,
  onSeek,
  className,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize data to ensure values are between 0 and 1
  const normalizedData = useMemo(() => {
    const max = Math.max(...data);
    return data.map((v) => v / max);
  }, [data]);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    // Set canvas size accounting for device pixel ratio
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    const barWidth = 2;
    const barGap = 1;
    const totalBarWidth = barWidth + barGap;
    const barCount = Math.floor(rect.width / totalBarWidth);

    // Resample data to fit bar count
    const sampledData: number[] = [];
    const samplesPerBar = normalizedData.length / barCount;

    for (let i = 0; i < barCount; i++) {
      const start = Math.floor(i * samplesPerBar);
      const end = Math.floor((i + 1) * samplesPerBar);
      const slice = normalizedData.slice(start, end);
      const avg = slice.length > 0 ? slice.reduce((a, b) => a + b, 0) / slice.length : 0;
      sampledData.push(avg);
    }

    // Calculate progress position
    const progressX = (progress / 100) * rect.width;

    // Draw bars
    sampledData.forEach((value, index) => {
      const x = index * totalBarWidth;
      const barHeight = Math.max(value * (rect.height - 4), 2);
      const y = (rect.height - barHeight) / 2;

      // Determine color based on progress
      ctx.fillStyle = x < progressX ? progressColor : waveColor;

      // Draw rounded bar
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 1);
      ctx.fill();
    });
  }, [normalizedData, progress, height, waveColor, progressColor]);

  // Handle click for seeking
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !onSeek || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    onSeek(Math.max(0, Math.min(100, percentage)));
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full",
        interactive && "cursor-pointer",
        className
      )}
      style={{ height }}
      onClick={handleClick}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

/**
 * Generate random waveform data that looks realistic
 * Uses a combination of sine waves and noise for organic feel
 */
export function generateWaveformData(
  length: number = 100,
  seed?: number
): number[] {
  // Simple seeded random for consistency
  const seededRandom = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  const data: number[] = [];
  const baseSeed = seed || Math.random() * 10000;

  for (let i = 0; i < length; i++) {
    // Combine multiple frequencies for organic look
    const t = i / length;
    const wave1 = Math.sin(t * Math.PI * 4) * 0.3;
    const wave2 = Math.sin(t * Math.PI * 8) * 0.2;
    const wave3 = Math.sin(t * Math.PI * 16) * 0.1;

    // Add noise
    const noise = (seededRandom(baseSeed + i) - 0.5) * 0.4;

    // Envelope (fade in/out at edges)
    const envelope = Math.sin(t * Math.PI);

    // Combine and normalize to 0-1
    const value = (0.5 + wave1 + wave2 + wave3 + noise) * envelope;
    data.push(Math.max(0.1, Math.min(1, value)));
  }

  return data;
}
