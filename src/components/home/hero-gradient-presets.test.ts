import { describe, expect, it } from "vitest";
import { HERO_GRADIENT_PRESETS, getHeroGradientPreset } from "./hero-gradient-presets";

describe("home hero Gradflow presets", () => {
  it("keeps four explicit Wave presets", () => {
    expect(Object.values(HERO_GRADIENT_PRESETS).flatMap((theme) => Object.values(theme))).toHaveLength(4);
    expect(Object.values(HERO_GRADIENT_PRESETS).flatMap((theme) => Object.values(theme)).every((preset) => preset.type === "wave")).toBe(true);
  });

  it("uses the requested fast, maximum-scale Wave setup in every preset", () => {
    const presets = Object.values(HERO_GRADIENT_PRESETS).flatMap((theme) => Object.values(theme));
    expect(presets.every((preset) => preset.speed === 1.2)).toBe(true);
    expect(presets.every((preset) => preset.scale === 3)).toBe(true);
    expect(presets.every((preset) => preset.noise === 0)).toBe(true);
  });

  it("keeps saturated light-mode waves behind dark hero copy", () => {
    expect(getHeroGradientPreset("light", "catalog").color3).toEqual({ r: 94, g: 175, b: 119 });
    expect(getHeroGradientPreset("light", "ai").color3).toEqual({ r: 160, g: 111, b: 232 });
  });

  it("does not reuse light colors in dark mode", () => {
    expect(getHeroGradientPreset("dark", "catalog").color3).not.toEqual(getHeroGradientPreset("light", "catalog").color3);
    expect(getHeroGradientPreset("dark", "ai").color3).not.toEqual(getHeroGradientPreset("light", "ai").color3);
  });
});
