import { describe, expect, it } from "vitest";
import { DEFAULT_HERO_BACKGROUND, HERO_BACKGROUND_OPTIONS } from "./types";
import { getHeroPalette, HERO_PALETTES, hexToUnitRgb } from "./presets";

describe("home hero background laboratory", () => {
  it("keeps the requested ten-option order and Gradflow default", () => {
    expect(HERO_BACKGROUND_OPTIONS.map(({ id }) => id)).toEqual([
      "gradflow", "floating-lines", "soft-aurora", "iridescence", "waves",
      "orb", "ghost-fibers", "gradient-waves", "web-threads", "liquid-ether",
    ]);
    expect(new Set(HERO_BACKGROUND_OPTIONS.map(({ id }) => id)).size).toBe(10);
    expect(DEFAULT_HERO_BACKGROUND).toBe("gradflow");
  });

  it("defines four complete and distinct Gradflow-derived palettes", () => {
    expect(Object.keys(HERO_PALETTES)).toEqual(["catalog-light", "catalog-dark", "ai-light", "ai-dark"]);
    const signatures = Object.values(HERO_PALETTES).map((palette) => Object.values(palette).join("|"));
    expect(new Set(signatures).size).toBe(4);
    for (const palette of Object.values(HERO_PALETTES)) {
      expect([palette.base, palette.soft, palette.primary, palette.secondary, palette.highlight]
        .every((color) => /^#[0-9A-F]{6}$/i.test(color))).toBe(true);
    }
    expect(HERO_PALETTES["catalog-light"]).toMatchObject({ base: "#F2F1ED", soft: "#B7DDC0", primary: "#203929" });
    expect(HERO_PALETTES["ai-light"]).toMatchObject({ base: "#F4EFFF", soft: "#CBB5FB", primary: "#2C1B49" });
    expect(HERO_PALETTES["ai-dark"]).toMatchObject({ base: "#111411", soft: "#2C1B49", primary: "#5C3594" });
  });

  it("derives the context key and shader RGB values", () => {
    expect(getHeroPalette("dark", "ai").key).toBe("ai-dark");
    expect(hexToUnitRgb("#FF0080")).toEqual([1, 0, 128 / 255]);
  });
});
