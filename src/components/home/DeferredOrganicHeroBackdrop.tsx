"use client";

import { useMotionValue } from "framer-motion";
import { SignalFieldLoader } from "./SignalFieldLoader";
import type { SearchMode } from "@/types";

export function DeferredOrganicHeroBackdrop({ mode }: { mode: SearchMode }) {
  const neutralX = useMotionValue(0);
  const neutralY = useMotionValue(0);

  return (
    <div aria-hidden="true" data-testid="organic-hero-backdrop" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--hero-accent)_12%,var(--surface))_0%,var(--surface)_42%,color-mix(in_srgb,var(--hero-soft)_38%,var(--surface))_72%,var(--surface)_100%)] transition-colors duration-500" />
      <div className="hero-signal-field pointer-events-none absolute -inset-x-[12%] inset-y-[5%]">
        <SignalFieldLoader pointerX={neutralX} pointerY={neutralY} mode={mode} />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_49.9%,color-mix(in_srgb,var(--foreground)_6%,transparent)_50%,transparent_50.1%)] opacity-20" />
    </div>
  );
}
