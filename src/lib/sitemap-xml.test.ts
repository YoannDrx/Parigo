import { describe, expect, it, vi } from "vitest";
import { renderUrlSet } from "./sitemap-xml";

describe("renderUrlSet", () => {
  it("conserve les dates passées et omet les dates amont futures", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T13:30:00.000Z"));

    const xml = renderUrlSet([
      { fr: "/labels/past", en: "/en/labels/past", lastModified: "2026-08-30T10:00:00.000Z" },
      { fr: "/labels/future", en: "/en/labels/future", lastModified: "2026-08-31T21:01:30.000Z" },
    ]);

    expect(xml).toContain("<lastmod>2026-08-30T10:00:00.000Z</lastmod>");
    expect(xml).not.toContain("2026-08-31T21:01:30.000Z");
    vi.useRealTimers();
  });
});
