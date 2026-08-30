import type { Theme } from "@/components/providers/ThemeProvider";
import type { HeroBackgroundMode, HeroPalette, HeroPaletteKey } from "./types";

export const HERO_PALETTES: Record<HeroPaletteKey, HeroPalette> = {
  "catalog-light": {
    base: "#F2F1ED",
    soft: "#B7DDC0",
    primary: "#203929",
    secondary: "#3F704D",
    highlight: "#5EAF77",
    contentVeil: 0.68,
  },
  "catalog-dark": {
    base: "#111411",
    soft: "#203929",
    primary: "#3F704D",
    secondary: "#5EAF77",
    highlight: "#B7DDC0",
    contentVeil: 0.7,
  },
  "ai-light": {
    base: "#F4EFFF",
    soft: "#CBB5FB",
    primary: "#2C1B49",
    secondary: "#5C3594",
    highlight: "#A06FE8",
    contentVeil: 0.74,
  },
  "ai-dark": {
    base: "#111411",
    soft: "#2C1B49",
    primary: "#5C3594",
    secondary: "#A06FE8",
    highlight: "#CBB5FB",
    contentVeil: 0.74,
  },
};

export function getHeroPalette(theme: Theme, mode: HeroBackgroundMode) {
  const key: HeroPaletteKey = `${mode}-${theme}`;
  return { key, palette: HERO_PALETTES[key] };
}

export function hexToUnitRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255) as [number, number, number];
}
