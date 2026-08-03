import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../..");

const publicCatalogFiles = [
  "src/app/albums/[id]/page.tsx",
  "src/app/compositeurs/page.tsx",
  "src/app/compositeurs/[slug]/page.tsx",
  "src/app/clips/page.tsx",
  "src/app/clips/[slug]/page.tsx",
  "src/app/synchronisations/page.tsx",
  "src/app/synchronisations/[slug]/page.tsx",
  "src/app/sitemaps/[kind]/route.ts",
  "src/lib/editorial/videos.ts",
  "src/lib/youtube/synchronisations.ts",
];

const historicalSources = [
  "editorial.generated",
  "editorial/contracts",
  "catalog-composer-profiles",
  "content/synchronisations",
  "content/matching",
  "video-overrides",
];

describe("public catalog source boundaries", () => {
  it.each(publicCatalogFiles)("keeps %s independent from historical editorial sources", (file) => {
    const source = readFileSync(resolve(projectRoot, file), "utf8");
    for (const forbidden of historicalSources) {
      expect(source, `${file} must not import or read ${forbidden}`).not.toContain(forbidden);
    }
  });

  it("keeps video inventories connected to their configured YouTube playlists", () => {
    const clips = readFileSync(resolve(projectRoot, "src/lib/editorial/videos.ts"), "utf8");
    const synchronisations = readFileSync(resolve(projectRoot, "src/lib/youtube/synchronisations.ts"), "utf8");

    expect(clips).toContain("fetchYouTubePlaylist");
    expect(synchronisations).toContain("fetchYouTubePlaylist");
    expect(clips).not.toMatch(/catch\([^)]*\)\s*=>\s*(?:clips|\[)/);
    expect(synchronisations).not.toMatch(/catch\([^)]*\)\s*=>\s*(?:SYNCHRONISATIONS|\[)/);
  });
});
