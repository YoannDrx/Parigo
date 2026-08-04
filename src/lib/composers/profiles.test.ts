import { describe, expect, it } from "vitest";
import {
  CANONICAL_COMPOSER_SOURCE_COMMIT,
  canonicalComposerProfiles,
  collectCanonicalComposerSummaries,
  getCanonicalComposerProfileForCredit,
  resolveCanonicalComposerCredit,
} from "./profiles";

describe("canonical composer registry", () => {
  it("contains exactly the 45 unique public profiles", () => {
    expect(canonicalComposerProfiles).toHaveLength(45);
    expect(new Set(canonicalComposerProfiles.map((profile) => profile.slug))).toHaveLength(45);
    expect(new Set(canonicalComposerProfiles.map((profile) => profile.name))).toHaveLength(45);
  });

  it("keeps the audited Portfolio provenance and the eight missing bios empty", () => {
    expect(CANONICAL_COMPOSER_SOURCE_COMMIT).toBe("6e88259a2634d82c7fc7cc723fbd3537da9371af");
    const withoutBio = canonicalComposerProfiles
      .filter((profile) => profile.bio.fr === null && profile.bio.en === null)
      .map((profile) => profile.name);
    expect(withoutBio).toEqual([
      "Loic Laporte",
      "Scherazade Aissahine",
      "Stan Galouo",
      "Stéphane Delplanque",
      "Thierry Los",
      "Victor Baillet",
      "Vincent Bouhelier",
      "Xavier Sibre",
    ]);
    expect(canonicalComposerProfiles.filter((profile) => profile.bio.fr && profile.bio.en)).toHaveLength(37);
  });

  it("maps civil identities globally and collective identities only on their audited album", () => {
    expect(getCanonicalComposerProfileForCredit("Franck Sinnassamy")?.slug).toBe("dj-hertz");
    expect(getCanonicalComposerProfileForCredit("Amaury Messelier (SACEM)")?.slug).toBe("arom");
    expect(getCanonicalComposerProfileForCredit("Jean-Michel Vallet", "PGO0031")?.slug).toBe("after-in-paris");
    expect(getCanonicalComposerProfileForCredit("Jean-Michel Vallet", "PGO0042")).toBeUndefined();
    expect(getCanonicalComposerProfileForCredit("Pierre Millet", "PGO0034")?.slug).toBe("ana-kap");
    expect(getCanonicalComposerProfileForCredit("Pierre Millet", "PGO0046")).toBeUndefined();
  });

  it("exposes the preferred Harvest identity without merging distinct credited names", () => {
    expect(resolveCanonicalComposerCredit("Molenat Alexis (SACEM)", "PGO0033")?.identity.preferredName).toBe("Alexis Molenat");
    expect(resolveCanonicalComposerCredit("Flore Morchin (SACEM)", "PGO0049")?.identity.preferredName).toBe("Flore Morfin");
    expect(resolveCanonicalComposerCredit("N’Zeng (SACEM)", "PGO0049")?.identity.preferredName).toBe("N Zeng");
    expect(resolveCanonicalComposerCredit("Sebastien Blanchon (SACEM)", "PGO0049")?.identity.preferredName).toBe("Sébastien Blanchon");
    expect(resolveCanonicalComposerCredit("Claire Michael", "PGO0031")?.identity.preferredName).toBe("Claire Michael");
    expect(resolveCanonicalComposerCredit("Jean-Michel Vallet", "PGO0031")?.identity.preferredName).toBe("Jean-Michel Vallet");
  });

  it("does not leak scoped relations while aggregating tracks", () => {
    const profiles = collectCanonicalComposerSummaries([
      { id: "a", albumId: "1", albumCode: "PGO0031", albumTitle: "After", composers: ["Jean-Michel Vallet"] },
      { id: "b", albumId: "2", albumCode: "PGO0099", albumTitle: "Solo", composers: ["Jean-Michel Vallet"] },
      { id: "c", albumId: "3", albumCode: "PGO0034", albumTitle: "Ana", composers: ["Pierre Millet"] },
      { id: "d", albumId: "4", albumCode: "PGO0046", albumTitle: "Other", composers: ["Pierre Millet"] },
    ]);
    expect(profiles.find((profile) => profile.slug === "after-in-paris")?.trackCount).toBe(1);
    expect(profiles.find((profile) => profile.slug === "ana-kap")?.trackCount).toBe(1);
  });
});
