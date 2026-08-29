"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { GradFlowProps } from "gradflow";
import { useTheme } from "@/components/providers/ThemeProvider";
import type { SearchMode } from "@/types";
import { useHomeReducedMotion } from "./HomeMotion";
import { getHeroGradientPreset, type HeroGradientMode } from "./hero-gradient-presets";
import { supportsHardwareAcceleratedWebGl } from "./webgl-capability";

const DynamicGradFlow = dynamic<GradFlowProps>(
  () => import("gradflow").then((module) => module.GradFlow),
  { ssr: false },
);

type DataSavingNavigator = Navigator & {
  connection?: EventTarget & { saveData?: boolean };
};

function useEnhancedGradient(reduceMotion: boolean) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const connection = (navigator as DataSavingNavigator).connection;
    const compactOrCoarse = window.matchMedia("(max-width: 767px), (pointer: coarse)");
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      idleId = undefined;
      timeoutId = undefined;
      if (connection?.saveData || compactOrCoarse.matches || reduceMotion) {
        setEnabled(false);
        return;
      }
      const enable = () => setEnabled(supportsHardwareAcceleratedWebGl());
      if ("requestIdleCallback" in window) idleId = window.requestIdleCallback(enable, { timeout: 1_500 });
      else timeoutId = globalThis.setTimeout(enable, 700);
    };
    update();
    connection?.addEventListener("change", update);
    compactOrCoarse.addEventListener("change", update);
    return () => {
      connection?.removeEventListener("change", update);
      compactOrCoarse.removeEventListener("change", update);
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [reduceMotion]);

  return enabled;
}

export function HeroGradientBackdrop({ mode: searchMode }: { mode: SearchMode }) {
  const { theme } = useTheme();
  const reduceMotion = useHomeReducedMotion();
  const enhancedGradient = useEnhancedGradient(reduceMotion);
  const mode: HeroGradientMode = searchMode === "keyword" ? "catalog" : "ai";
  const presetName = `${mode}-${theme}`;
  const config = getHeroGradientPreset(theme, mode);

  return (
    <div
      aria-hidden="true"
      className="hero-gradflow pointer-events-none absolute inset-0 overflow-hidden"
      data-gradient-mode={mode}
      data-gradient-preset={presetName}
      data-motion={reduceMotion ? "static" : "animated"}
      data-renderer={enhancedGradient ? "webgl" : "fallback"}
      data-testid="hero-gradient-backdrop"
    >
      <div className="hero-gradflow__fallback absolute inset-0" />
      {enhancedGradient ? (
        <AnimatePresence initial={false}>
          <motion.div
            key={presetName}
            className="hero-gradflow__layer absolute inset-0"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.62, ease: [0.22, 1, 0.36, 1] }}
          >
            <DynamicGradFlow
              className="hero-gradflow__canvas"
              config={config}
              paused={reduceMotion}
            />
          </motion.div>
        </AnimatePresence>
      ) : null}
      <div className="hero-gradflow__veil absolute inset-0" />
    </div>
  );
}
