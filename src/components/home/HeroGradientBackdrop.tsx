"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import type { GradFlowProps } from "gradflow";
import type { Theme } from "@/components/providers/ThemeProvider";
import { getHeroGradientPreset, type HeroGradientMode } from "./hero-gradient-presets";

const DynamicGradFlow = dynamic<GradFlowProps>(
  () => import("gradflow").then((module) => module.GradFlow),
  { ssr: false },
);

export function HeroGradflowRenderer({ mode, theme }: { mode: HeroGradientMode; theme: Theme }) {
  const presetName = `${mode}-${theme}`;
  const config = getHeroGradientPreset(theme, mode);

  return (
    <motion.div
      key={presetName}
      className="hero-background__engine absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <DynamicGradFlow className="hero-gradflow__canvas" config={config} />
    </motion.div>
  );
}
