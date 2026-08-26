import type { GradientConfig } from "gradflow";
import type { Theme } from "@/components/providers/ThemeProvider";

export type HeroGradientMode = "catalog" | "ai";

export const HERO_GRADIENT_PRESETS = {
  light: {
    catalog: {
      color1: { r: 242, g: 241, b: 237 },
      color2: { r: 183, g: 221, b: 192 },
      color3: { r: 94, g: 175, b: 119 },
      speed: 1.2,
      scale: 3,
      type: "wave",
      noise: 0,
    },
    ai: {
      color1: { r: 244, g: 239, b: 255 },
      color2: { r: 203, g: 181, b: 251 },
      color3: { r: 160, g: 111, b: 232 },
      speed: 1.2,
      scale: 3,
      type: "wave",
      noise: 0,
    },
  },
  dark: {
    catalog: {
      color1: { r: 17, g: 20, b: 17 },
      color2: { r: 32, g: 57, b: 41 },
      color3: { r: 63, g: 112, b: 77 },
      speed: 1.2,
      scale: 3,
      type: "wave",
      noise: 0,
    },
    ai: {
      color1: { r: 17, g: 20, b: 17 },
      color2: { r: 44, g: 27, b: 73 },
      color3: { r: 92, g: 53, b: 148 },
      speed: 1.2,
      scale: 3,
      type: "wave",
      noise: 0,
    },
  },
} as const satisfies Record<Theme, Record<HeroGradientMode, GradientConfig>>;

export function getHeroGradientPreset(theme: Theme, mode: HeroGradientMode): GradientConfig {
  return HERO_GRADIENT_PRESETS[theme][mode];
}
