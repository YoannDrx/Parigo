"use client";

import dynamic from "next/dynamic";
import type { MotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { SignalFieldProps } from "./SignalField";
import { SignalFieldFallback } from "./SignalFieldFallback";

const DynamicSignalField = dynamic<SignalFieldProps>(
  () => import("./SignalField").then((module) => module.SignalField),
  { ssr: false }
);

export function SignalFieldLoader({ pointerX, pointerY }: { pointerX: MotionValue<number>; pointerY: MotionValue<number> }) {
  const [canRender, setCanRender] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [staticFallback, setStaticFallback] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const intersectingRef = useRef(true);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = navigator as Navigator & { connection?: { saveData?: boolean } };
    const canvas = document.createElement("canvas");
    const hasWebGL = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    const assessRenderer = () => {
      const staticMode = reducedMotion.matches || Boolean(connection.connection?.saveData);
      setStaticFallback(staticMode);
      setCanRender(desktop.matches && !staticMode && hasWebGL);
    };
    const syncActivity = () => setIsActive(intersectingRef.current && !document.hidden);
    const frame = window.requestAnimationFrame(assessRenderer);
    const observer = new IntersectionObserver(
      ([entry]) => {
        intersectingRef.current = entry.isIntersecting;
        syncActivity();
      },
      { rootMargin: "160px" },
    );
    if (containerRef.current) observer.observe(containerRef.current);
    desktop.addEventListener("change", assessRenderer);
    reducedMotion.addEventListener("change", assessRenderer);
    document.addEventListener("visibilitychange", syncActivity);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      desktop.removeEventListener("change", assessRenderer);
      reducedMotion.removeEventListener("change", assessRenderer);
      document.removeEventListener("visibilitychange", syncActivity);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {canRender && isActive
        ? <DynamicSignalField pointerX={pointerX} pointerY={pointerY} />
        : <SignalFieldFallback active={isActive && !staticFallback} staticMode={staticFallback} />}
    </div>
  );
}
