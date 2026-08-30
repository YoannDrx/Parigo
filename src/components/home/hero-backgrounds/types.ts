import type { Theme } from "@/components/providers/ThemeProvider";

export const HERO_BACKGROUND_OPTIONS = [
  { id: "gradflow", label: "Actuel · Gradflow", renderer: "gradflow" },
  { id: "floating-lines", label: "Floating Lines", renderer: "three" },
  { id: "soft-aurora", label: "Soft Aurora", renderer: "ogl" },
  { id: "iridescence", label: "Iridescence", renderer: "ogl" },
  { id: "waves", label: "Waves", renderer: "canvas-2d" },
  { id: "orb", label: "Orb", renderer: "ogl" },
  { id: "ghost-fibers", label: "Ghost Fibers", renderer: "ogl" },
  { id: "gradient-waves", label: "Gradient Waves", renderer: "ogl" },
  { id: "web-threads", label: "Web Threads", renderer: "ogl" },
  { id: "liquid-ether", label: "Liquid Ether", renderer: "three" },
] as const;

export type HeroBackgroundId = (typeof HERO_BACKGROUND_OPTIONS)[number]["id"];
export type HeroBackgroundMode = "catalog" | "ai";
export type HeroPaletteKey = `${HeroBackgroundMode}-${Theme}`;
export type HeroRendererKind = "gradflow" | "canvas-2d" | "ogl" | "three" | "fallback";

export interface HeroPalette {
  base: string;
  soft: string;
  primary: string;
  secondary: string;
  highlight: string;
  contentVeil: number;
}

export const DEFAULT_HERO_BACKGROUND: HeroBackgroundId = "gradflow";

