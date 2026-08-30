import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "./ThemeProvider";

function Probe() {
  const { theme, toggleTheme } = useTheme();
  return <button type="button" onClick={toggleTheme}>{theme}</button>;
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
    window.localStorage.clear();
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: query.includes("max-width") || query.includes("pointer: coarse"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete document.documentElement.dataset.themeSwitching;
    Reflect.deleteProperty(document, "startViewTransition");
  });

  it("applies every mobile theme surface in the same interaction", () => {
    const transition = vi.fn();
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: transition });
    render(<ThemeProvider initialTheme="dark"><Probe /></ThemeProvider>);

    act(() => screen.getByRole("button", { name: "dark" }).click());

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(window.localStorage.getItem("parigo-theme")).toBe("light");
    expect(document.cookie).toContain("parigo-theme=light");
    expect(document.documentElement.dataset.themeSwitching).toBe("instant");
    expect(transition).not.toHaveBeenCalled();

    act(() => { vi.runAllTimers(); });
    expect(document.documentElement.dataset.themeSwitching).toBeUndefined();
  });
});
