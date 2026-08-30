"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
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
    if (connection?.saveData || reduceMotion) {
      queueMicrotask(() => setEnabled(false));
    } else {
      const enable = () => setEnabled(supportsHardwareAcceleratedWebGl());
      if (window.requestIdleCallback) window.requestIdleCallback(enable);
      else setTimeout(enable, 700);
    }
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
        <motion.div
          key={presetName}
          className="hero-gradflow__layer absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
        >
          <DynamicGradFlow className="hero-gradflow__canvas" config={config} />
        </motion.div>
      ) : null}
      <div className="hero-gradflow__veil absolute inset-0" />
    </div>
  );
}
