"use client";

import { useEffect, useState, useSyncExternalStore, type ComponentType } from "react";
import { SignalFieldFallback } from "./SignalFieldFallback";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(callback: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function DeferredOrganicHeroBackdrop() {
  const [Backdrop, setBackdrop] = useState<ComponentType | null>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (!desktop.matches || reducedMotion.matches || connection.connection?.saveData) return;

    let active = true;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let idle: number | null = null;
    const load = () => {
      void import("./OrganicHeroBackdrop").then((module) => {
        if (active) setBackdrop(() => module.OrganicHeroBackdrop);
      });
    };
    if ("requestIdleCallback" in window) idle = window.requestIdleCallback(load, { timeout: 1_800 });
    else timeout = globalThis.setTimeout(load, 600);

    return () => {
      active = false;
      if (idle !== null && "cancelIdleCallback" in window) window.cancelIdleCallback(idle);
      if (timeout !== null) globalThis.clearTimeout(timeout);
    };
  }, []);

  if (Backdrop) return <Backdrop />;
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(89,190,118,.14),transparent_39%),linear-gradient(180deg,var(--surface)_0%,color-mix(in_srgb,var(--signal-soft)_34%,var(--surface))_55%,var(--surface)_100%)]" />
      <div className="absolute left-1/2 top-1/2 aspect-square w-[min(86vw,700px)] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-[32%_68%_42%_58%/64%_38%_62%_36%] border border-white/55 bg-[linear-gradient(135deg,rgba(255,255,255,.5),rgba(80,165,105,.18)_48%,rgba(255,255,255,.34))] shadow-[inset_0_0_130px_rgba(255,255,255,.5),0_42px_120px_rgba(34,106,58,.18)] motion-safe:animate-[pulse_9s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute -inset-x-[12%] inset-y-[5%] opacity-78 mix-blend-multiply dark:mix-blend-screen">
        <SignalFieldFallback active staticMode={reducedMotion} />
      </div>
    </div>
  );
}
