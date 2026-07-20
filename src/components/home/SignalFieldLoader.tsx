"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const DynamicSignalField = dynamic(
  () => import("./SignalField").then((module) => module.SignalField),
  { ssr: false }
);

export function SignalFieldLoader() {
  const [canRender, setCanRender] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = navigator as Navigator & { connection?: { saveData?: boolean } };
    const canvas = document.createElement("canvas");
    const hasWebGL = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    const frame = window.requestAnimationFrame(() => {
      setCanRender(window.innerWidth >= 768 && !reduced && !connection.connection?.saveData && hasWebGL);
    });
    const onVisibility = () => setIsActive(!document.hidden);
    const observer = new IntersectionObserver(
      ([entry]) => setIsActive(entry.isIntersecting && !document.hidden),
      { rootMargin: "160px" },
    );
    if (containerRef.current) observer.observe(containerRef.current);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {canRender && isActive ? <DynamicSignalField /> : (
        <>
        <div className="absolute left-[-10%] top-[42%] h-px w-[120%] rotate-[-6deg] bg-[var(--color-signal)] shadow-[0_0_38px_8px_rgba(108,255,103,.3)]" />
        <div className="absolute left-[-10%] top-[48%] h-px w-[120%] rotate-[3deg] bg-white/35" />
        <div className="absolute left-[-10%] top-[54%] h-px w-[120%] rotate-[-2deg] bg-emerald-200/25" />
        </>
      )}
    </div>
  );
}
