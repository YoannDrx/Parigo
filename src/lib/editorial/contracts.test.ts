import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  clips,
  composerProfiles,
  getComposerByCredit,
  normalizeHarvestCredit,
  publishedComposerProfiles,
} from "./contracts";

describe("editorial content", () => {
  it("normalizes Harvest credits conservatively", () => {
    expect(normalizeHarvestCredit("Frédéric HANAK (SACEM)")).toBe("frederic hanak");
    expect(normalizeHarvestCredit("N’ZENG (NS)")).toBe("n zeng");
    expect(normalizeHarvestCredit("Jean-Baptiste Hanak")).not.toBe(normalizeHarvestCredit("Cédric Hanak"));
  });

  it("keeps slugs and published aliases unique", () => {
    expect(new Set(composerProfiles.map((profile) => profile.slug)).size).toBe(composerProfiles.length);
    const aliases = publishedComposerProfiles.flatMap((profile) => profile.harvestAliases.map(normalizeHarvestCredit));
    expect(new Set(aliases).size).toBe(aliases.length);
    expect(new Set(clips.map((clip) => clip.slug)).size).toBe(clips.length);
  });

  it("references existing optimized assets", () => {
    for (const asset of [
      ...publishedComposerProfiles.map((profile) => profile.image),
      ...clips.map((clip) => clip.cover),
    ]) {
      expect(existsSync(path.join(process.cwd(), "public", asset))).toBe(true);
    }
  });

  it("publishes the strict clip inventory", () => {
    expect(clips).toHaveLength(15);
    expect(clips.filter((clip) => clip.youtubeId)).toHaveLength(14);
    expect(clips.filter((clip) => !clip.composerSlugs.length).map((clip) => clip.slug).sort()).toEqual([
      "egocentric-visuo-spatial-perspective-2",
      "garden-of-eden",
      "klang-brutt",
    ]);
  });

  it("keeps the confirmed Acid Body Music relations in the offline editorial manifest", () => {
    const clip = clips.find((item) => item.slug === "acid-body-music-2");

    expect(clip).toMatchObject({
      composerSlugs: ["modulhater"],
      relatedAlbumCode: "PGO0025",
      reviewState: "verified",
      composerRelationSource: "manual",
      albumRelationSource: "manual",
    });
  });

  it("resolves exact published composer aliases", () => {
    expect(getComposerByCredit("Ugly Mac Beer (SACEM)")?.slug).toBe("ugly-mac-beer");
    expect(getComposerByCredit("Unknown Composer")).toBeUndefined();
  });
});
