"use client";

import type { MotionValue } from "framer-motion";
import { useEffect, useRef } from "react";

export interface SignalFieldProps {
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
}

interface Ribbon {
  color: string;
  amplitude: number;
  speed: number;
  offset: number;
  opacity: number;
  width: number;
}

const RIBBONS: Ribbon[] = [
  { color: "#6cff67", amplitude: 0.19, speed: 0.56, offset: 0, opacity: 1, width: 2.2 },
  { color: "#dfffdc", amplitude: 0.13, speed: 0.4, offset: 2.1, opacity: 0.68, width: 1.35 },
  { color: "#75a995", amplitude: 0.23, speed: 0.28, offset: 4.2, opacity: 0.46, width: 1 },
];

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

export function SignalField({ pointerX, pointerY }: SignalFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      for (const ribbon of RIBBONS) {
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
