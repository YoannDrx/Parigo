import { describe, expect, it } from "vitest";
import { canonicalComposerProfiles } from "@/lib/composers/profiles";
import { getVideoComposerSlugs, VIDEO_COMPOSER_RELATIONS } from "./video-composer-relations";

describe("manual video-to-composer relations", () => {
  it("contains the 30 supplied clips and 52 validated associations", () => {
    const entries = Object.entries(VIDEO_COMPOSER_RELATIONS);

    expect(entries).toHaveLength(30);
    expect(entries.reduce((total, [, composerSlugs]) => total + composerSlugs.length, 0)).toBe(52);
  });

  it("publishes every validated Lofi Hip Hop contributor", () => {
    expect(getVideoComposerSlugs("lsXj6hGHM-Q")).toEqual(["bonetrips", "tcheep", "chicho-cortez"]);
  });

  it("only references unique canonical composer slugs", () => {
    const canonicalSlugs = new Set(canonicalComposerProfiles.map((profile) => profile.slug));

    for (const [youtubeId, composerSlugs] of Object.entries(VIDEO_COMPOSER_RELATIONS)) {
      expect(youtubeId, "YouTube ID must not be empty").not.toBe("");
      expect(new Set(composerSlugs).size, `${youtubeId} contains duplicate composers`).toBe(composerSlugs.length);
      for (const composerSlug of composerSlugs) {
        expect(canonicalSlugs.has(composerSlug), `${youtubeId} references ${composerSlug}`).toBe(true);
      }
    }
  });

  it("returns defensive copies and no inferred fallback", () => {
    const composerSlugs = getVideoComposerSlugs("I3G64U_dj0s");
    composerSlugs.push("unknown-composer");

    expect(getVideoComposerSlugs("I3G64U_dj0s")).toEqual(["ugly-mac-beer", "yann-kornowicz"]);
    expect(getVideoComposerSlugs("unknown-video")).toEqual([]);
  });
});
