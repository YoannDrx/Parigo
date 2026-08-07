import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../..");

const publicCatalogFiles = [
  "src/app/albums/[id]/page.tsx",
  "src/app/talents/page.tsx",
  "src/app/talents/[slug]/page.tsx",
  "src/app/clips/page.tsx",
  "src/app/clips/[slug]/page.tsx",
  "src/app/synchronisations/page.tsx",
  "src/app/synchronisations/[slug]/page.tsx",
  "src/app/sitemaps/[kind]/route.ts",
  "src/lib/editorial/videos.ts",
  "src/lib/youtube/synchronisations.ts",
];

const historicalSources = [
  "catalog-composer-profiles",
  "content/synchronisations",
];

describe("public catalog source boundaries", () => {
  it.each(publicCatalogFiles)("keeps %s independent from historical editorial sources", (file) => {
    const source = readFileSync(resolve(projectRoot, file), "utf8");
    for (const forbidden of historicalSources) {
      expect(source, `${file} must not import or read ${forbidden}`).not.toContain(forbidden);
    }
  });

  it("limits the local public composer source to the dedicated canonical registry", () => {
    const directory = readFileSync(resolve(projectRoot, "src/app/talents/page.tsx"), "utf8");
    const detail = readFileSync(resolve(projectRoot, "src/app/talents/[slug]/page.tsx"), "utf8");
    expect(directory).toContain("composers/profiles");
    expect(detail).toContain("composers/profiles");
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
