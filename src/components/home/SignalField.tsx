"use client";

import type { MotionValue } from "framer-motion";
import { useEffect, useRef } from "react";
import type { SearchMode } from "@/types";

export interface SignalFieldProps {
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  mode: SearchMode;
}

interface Ribbon {
  color: string;
  amplitude: number;
  speed: number;
  offset: number;
  opacity: number;
  width: number;
}

interface PaletteTransition {
  from: Ribbon[];
  to: Ribbon[];
  startedAt: number;
}

const PALETTE_TRANSITION_MS = 620;

const KEYWORD_RIBBONS: Ribbon[] = [
  { color: "#6cff67", amplitude: 0.19, speed: 0.56, offset: 0, opacity: 1, width: 2.2 },
  { color: "#dfffdc", amplitude: 0.13, speed: 0.4, offset: 2.1, opacity: 0.68, width: 1.35 },
  { color: "#75a995", amplitude: 0.23, speed: 0.28, offset: 4.2, opacity: 0.46, width: 1 },
];
const AI_RIBBONS: Ribbon[] = [
  { color: "#b675ff", amplitude: 0.19, speed: 0.56, offset: 0, opacity: 1, width: 2.2 },
  { color: "#ead8ff", amplitude: 0.13, speed: 0.4, offset: 2.1, opacity: 0.72, width: 1.35 },
  { color: "#8a62bd", amplitude: 0.23, speed: 0.28, offset: 4.2, opacity: 0.52, width: 1 },
];

function parseHex(color: string) {
  const value = Number.parseInt(color.slice(1), 16);
  return { red: value >> 16, green: (value >> 8) & 255, blue: value & 255 };
}

function mixColor(from: string, to: string, progress: number) {
  const start = parseHex(from);
  const end = parseHex(to);
  const channel = (left: number, right: number) => Math.round(left + (right - left) * progress);
  return `rgb(${channel(start.red, end.red)} ${channel(start.green, end.green)} ${channel(start.blue, end.blue)})`;
}

function interpolatePalette(from: Ribbon[], to: Ribbon[], progress: number): Ribbon[] {
  return from.map((ribbon, index) => {
    const target = to[index] ?? ribbon;
    return {
      ...ribbon,
      color: mixColor(ribbon.color, target.color, progress),
      opacity: ribbon.opacity + (target.opacity - ribbon.opacity) * progress,
      width: ribbon.width + (target.width - ribbon.width) * progress,
    };
  });
}

function drawRibbon(
  context: CanvasRenderingContext2D,
  ribbon: Ribbon,
  width: number,
  height: number,
  elapsed: number,
  pointerX: number,
  pointerY: number,
) {
  const points = 180;
  const centreY = height * 0.5 - pointerY * height * 0.025;
  context.beginPath();
  for (let index = 0; index < points; index += 1) {
    const progress = index / (points - 1);
    const envelope = Math.sin(progress * Math.PI);
    const time = elapsed * ribbon.speed;
    const wave = Math.sin(progress * 16 + time + ribbon.offset) * ribbon.amplitude * height * envelope;
    const detail = Math.sin(progress * 41 - time * 1.4) * ribbon.amplitude * height * 0.22;
    const x = progress * width + pointerX * 7 * envelope;
    const y = centreY + wave + detail;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.globalAlpha = ribbon.opacity;
  context.strokeStyle = ribbon.color;
  context.lineWidth = ribbon.width;
  context.lineCap = "round";
  context.stroke();
}

export function SignalField({ pointerX, pointerY, mode }: SignalFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initialPalette = mode === "ai" ? AI_RIBBONS : KEYWORD_RIBBONS;
  const paletteTransitionRef = useRef<PaletteTransition>({
    from: initialPalette,
    to: initialPalette,
    startedAt: 0,
  });

  useEffect(() => {
    const now = performance.now();
    const previous = paletteTransitionRef.current;
    const previousProgress = Math.min(1, Math.max(0, (now - previous.startedAt) / PALETTE_TRANSITION_MS));
    const currentPalette = interpolatePalette(previous.from, previous.to, previousProgress);
    paletteTransitionRef.current = {
      from: currentPalette,
      to: mode === "ai" ? AI_RIBBONS : KEYWORD_RIBBONS,
      startedAt: now,
    };
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    let animationFrame = 0;
    let visible = true;
    let width = 0;
    let height = 0;
    const startedAt = performance.now();

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const render = (now: number) => {
      if (!visible) return;
      context.clearRect(0, 0, width, height);
      const elapsed = (now - startedAt) / 1000;
      const transition = paletteTransitionRef.current;
      const paletteProgress = Math.min(1, Math.max(0, (now - transition.startedAt) / PALETTE_TRANSITION_MS));
      for (const ribbon of interpolatePalette(transition.from, transition.to, paletteProgress)) {
        drawRibbon(context, ribbon, width, height, elapsed, pointerX.get(), pointerY.get());
      }
      context.globalAlpha = 1;
      animationFrame = window.requestAnimationFrame(render);
    };

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      const nextVisible = Boolean(entry?.isIntersecting);
      if (nextVisible === visible) return;
      visible = nextVisible;
      window.cancelAnimationFrame(animationFrame);
      if (visible) animationFrame = window.requestAnimationFrame(render);
    }, { rootMargin: "120px" });

    resizeObserver.observe(canvas);
    intersectionObserver.observe(canvas);
    resize();
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      visible = false;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [pointerX, pointerY]);

  return <canvas ref={canvasRef} aria-hidden="true" className="h-full w-full" />;
}
