"use client";

import { useMotionValue } from "framer-motion";
import type { PointerEvent } from "react";
import { SignalFieldLoader } from "./SignalFieldLoader";

export function DeferredOrganicHeroBackdrop() {
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width * 2 - 1);
    pointerY.set((event.clientY - bounds.top) / bounds.height * 2 - 1);
  };

  const reset = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <div aria-hidden="true" data-testid="organic-hero-backdrop" onPointerMove={move} onPointerLeave={reset} className="pointer-events-auto absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--signal)_12%,var(--surface))_0%,var(--surface)_42%,color-mix(in_srgb,var(--signal-soft)_38%,var(--surface))_72%,var(--surface)_100%)]" />
      <div className="hero-signal-field pointer-events-none absolute -inset-x-[12%] inset-y-[5%]">
        <SignalFieldLoader pointerX={pointerX} pointerY={pointerY} />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_49.9%,color-mix(in_srgb,var(--foreground)_6%,transparent)_50%,transparent_50.1%)] opacity-20" />
    </div>
  );
}
