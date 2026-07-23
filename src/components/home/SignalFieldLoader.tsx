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
  const intersectingRef = useRef(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = navigator as Navigator & { connection?: { saveData?: boolean } };
    const canvas = document.createElement("canvas");
    const hasWebGL = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    let idleHandle: number | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const assessRenderer = () => {
      const staticMode = reducedMotion.matches || Boolean(connection.connection?.saveData);
      setStaticFallback(staticMode);
      const eligible = desktop.matches && !staticMode && hasWebGL && intersectingRef.current;
      if (!eligible) {
        setCanRender(false);
        return;
      }
      const activate = () => setCanRender(true);
      if ("requestIdleCallback" in window) {
        idleHandle = window.requestIdleCallback(activate, { timeout: 1200 });
      } else {
        timeoutHandle = globalThis.setTimeout(activate, 180);
      }
    };
    const syncActivity = () => setIsActive(intersectingRef.current && !document.hidden);
    const frame = window.requestAnimationFrame(assessRenderer);
    const observer = new IntersectionObserver(
      ([entry]) => {
        intersectingRef.current = entry.isIntersecting;
        syncActivity();
        assessRenderer();
      },
      { rootMargin: "160px" },
    );
    if (containerRef.current) observer.observe(containerRef.current);
    desktop.addEventListener("change", assessRenderer);
    reducedMotion.addEventListener("change", assessRenderer);
    document.addEventListener("visibilitychange", syncActivity);
    return () => {
      window.cancelAnimationFrame(frame);
      if (idleHandle !== null && "cancelIdleCallback" in window) window.cancelIdleCallback(idleHandle);
      if (timeoutHandle !== null) window.clearTimeout(timeoutHandle);
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
