import { describe, expect, it } from "vitest";
import suppliedBiographies from "@/content/composer-sources/site-biographies.user-provided.json";
import {
  CANONICAL_COMPOSER_SOURCE_COMMIT,
  CANONICAL_COMPOSER_PROFILE_COUNT,
  canonicalComposerProfiles,
  collectCanonicalComposerSummaries,
  getCanonicalComposerProfile,
  getCanonicalComposerProfileForCredit,
  resolveCanonicalComposerCredit,
  resolveCanonicalComposerCredits,
} from "./profiles";

describe("canonical composer registry", () => {
  it("contains exactly the 55 unique public profiles", () => {
    expect(CANONICAL_COMPOSER_PROFILE_COUNT).toBe(55);
    expect(canonicalComposerProfiles).toHaveLength(55);
    expect(new Set(canonicalComposerProfiles.map((profile) => profile.slug))).toHaveLength(55);
    expect(new Set(canonicalComposerProfiles.map((profile) => profile.name))).toHaveLength(55);
  });

  it("keeps pinned, dated or user-provided provenance and leaves only unattested bios empty", () => {
    expect(CANONICAL_COMPOSER_SOURCE_COMMIT).toBe("02e173bb95e0481e0dee29c3b2d6b3a8ca01e8e2");
    const withoutBio = canonicalComposerProfiles
      .filter((profile) => profile.bio.fr === null && profile.bio.en === null)
      .map((profile) => profile.name);
    expect(withoutBio).toEqual([]);
    expect(canonicalComposerProfiles.filter((profile) => profile.bio.fr && profile.bio.en)).toHaveLength(55);
    expect(canonicalComposerProfiles.find((profile) => profile.slug === "thierry-los")?.provenance.source).toBe("user-provided");
    expect(canonicalComposerProfiles.find((profile) => profile.slug === "frederic-hanak")?.provenance.source).toBe("user-provided");
  });

  it("publishes the supplied biographies verbatim and records portrait overrides", () => {
    expect(Object.keys(suppliedBiographies.profiles)).toHaveLength(55);
    for (const [slug, biography] of Object.entries(suppliedBiographies.profiles)) {
      expect(canonicalComposerProfiles.find((profile) => profile.slug === slug)?.bio).toEqual({
        fr: biography.fr,
        en: biography.en,
      });
    }
    for (const slug of ["after-in-paris", "cedric-hanak", "laurent-dury", "thierry-los"]) {
      expect(canonicalComposerProfiles.find((profile) => profile.slug === slug)?.provenance).toMatchObject({
        source: "user-provided",
        imageOverride: { source: "user-provided" },
      });
    }
  });

  it("maps the four editorial profiles without leaking stage names into Harvest aliases", () => {
    expect(canonicalComposerProfiles.find((profile) => profile.slug === "aeon-seven")?.name).toBe("Aeon Seven");
    expect(canonicalComposerProfiles.some((profile) => profile.slug === "stephane-delplanque")).toBe(false);
    expect(getCanonicalComposerProfileForCredit("Stéphane Delplanque")?.slug).toBe("aeon-seven");
    expect(getCanonicalComposerProfileForCredit("Victor Baillet")?.name).toBe("Victor Baillet");
    expect(getCanonicalComposerProfileForCredit("Vincent Bouhelier")?.name).toBe("Vincent Bouhelier");
    expect(getCanonicalComposerProfileForCredit("Thierry Loshouarn")?.name).toBe("Thierry Los");
    expect(getCanonicalComposerProfileForCredit("Delplanque Stéphane")?.slug).toBe("aeon-seven");
    expect(getCanonicalComposerProfileForCredit("Mr Viktor")).toBeUndefined();
    expect(getCanonicalComposerProfileForCredit("Aociz")).toBeUndefined();
  });

  it("maps civil identities globally and collective identities only on their audited album", () => {
    expect(getCanonicalComposerProfileForCredit("Franck Sinnassamy")?.slug).toBe("dj-hertz");
    expect(getCanonicalComposerProfileForCredit("Amaury Messelier (SACEM)")?.slug).toBe("arom");
    expect(getCanonicalComposerProfileForCredit("Jean-Michel Vallet", "PGO0031")?.slug).toBe("after-in-paris");
    expect(getCanonicalComposerProfileForCredit("Vallet Jean-Michel", "PGO0031")?.slug).toBe("after-in-paris");
    expect(getCanonicalComposerProfileForCredit("Vallet Jean-Michel", "PGO0042")).toBeUndefined();
    expect(getCanonicalComposerProfileForCredit("Jean-Michel Vallet", "PGO0042")).toBeUndefined();
    expect(getCanonicalComposerProfile("pierre-millet")).toBeUndefined();
    expect(getCanonicalComposerProfileForCredit("Pierre Millet", "PGO0034")?.slug).toBe("ana-kap");
    expect(getCanonicalComposerProfileForCredit("Pierre Millet", "PGO0046")).toBeUndefined();
    expect(resolveCanonicalComposerCredits("Pierre Millet", "PGO0034").map(({ profile }) => profile.slug)).toEqual(["ana-kap"]);
  });

  it("maps the twelve new stage-name profiles and keeps collective relations album-scoped", () => {
    expect(getCanonicalComposerProfileForCredit("Wamid AL WAHAB (NS)")?.slug).toBe("aiwa");
    expect(getCanonicalComposerProfileForCredit("Charlotte DURAN (NS)")?.slug).toBe("coeur");
    expect(getCanonicalComposerProfileForCredit("Charlotte Durand")).toBeUndefined();
    expect(getCanonicalComposerProfileForCredit("Charlie Duran")).toBeUndefined();
    expect(canonicalComposerProfiles.find((profile) => profile.slug === "coeur")?.bio.fr).toContain("Cœur est une autrice");
    expect(canonicalComposerProfiles.find((profile) => profile.slug === "coeur")?.bio.en).toContain("Cœur is a French singer-songwriter");
    expect(resolveCanonicalComposerCredits("Charlotte DURAN", "PGO0035").map(({ profile }) => profile.slug)).toEqual(["coeur"]);
    expect(resolveCanonicalComposerCredits("Charlotte DURAN", "PGO0040").map(({ profile }) => profile.slug)).toEqual(["coeur"]);
    expect(getCanonicalComposerProfileForCredit("Emmanuel MAREE (SACEM)")?.slug).toBe("emmanuel-maree");
    expect(getCanonicalComposerProfileForCredit("Rodney Lucas (BMI)")?.slug).toBe("f-stokes");
    expect(getCanonicalComposerProfileForCredit("Sornin Emile (SACEM)")?.slug).toBe("forever-pavot");
    expect(collectCanonicalComposerSummaries([{
      id: "surf-fiction-main",
      albumId: "8b4986739468cfd8",
      albumCode: "PGO0033",
      albumTitle: "Surf Fiction",
      composers: ["Sornin Emile (SACEM)"],
    }]).find((profile) => profile.slug === "forever-pavot")).toMatchObject({
      trackCount: 1,
      albumIds: ["8b4986739468cfd8"],
      albumCodes: ["PGO0033"],
    });
    expect(getCanonicalComposerProfileForCredit("Frédéric HANAK")?.slug).toBe("frederic-hanak");
    expect(getCanonicalComposerProfileForCredit("Camille LUCA")?.slug).toBe("roma-luca");
    expect(getCanonicalComposerProfileForCredit("THE REAL FAKE MC (SACEM)")?.slug).toBe("the-real-fake-mc");
    expect(getCanonicalComposerProfileForCredit("Samuel HIRSCH (NS)", "PGO0030")?.slug).toBe("arat-kilo");
    expect(getCanonicalComposerProfileForCredit("Samuel HIRSCH (NS)", "PGO0048")).toBeUndefined();
    expect(resolveCanonicalComposerCredits("Liqid", "PGO0035").map(({ profile }) => profile.slug)).toEqual(["liqid"]);
    expect(resolveCanonicalComposerCredits("Liqid", "PGO0040").map(({ profile }) => profile.slug)).toEqual(["liqid"]);
    expect(getCanonicalComposerProfileForCredit("The Well Quartet", "PGO0060")?.slug).toBe("the-well-quartet");
  });

  it("uses the requested public names for Le Grand David and JB HANAK", () => {
    expect(getCanonicalComposerProfile("grand-david")?.name).toBe("Le Grand David");
    expect(getCanonicalComposerProfileForCredit("Grand David")?.name).toBe("Le Grand David");
    expect(getCanonicalComposerProfile("jb-hanak")?.name).toBe("JB HANAK");
    expect(getCanonicalComposerProfileForCredit("Jean-Baptiste HANAK")?.name).toBe("JB HANAK");
  });

  it("keeps Mutant Ninja contributors as unlinked credits when they have no public profile", () => {
    expect(getCanonicalComposerProfile("mutant-ninja")).toBeUndefined();
    expect(getCanonicalComposerProfileForCredit("Liqid")?.slug).toBe("liqid");
    expect(getCanonicalComposerProfileForCredit("Bonetrips")?.slug).toBe("bonetrips");
    expect(getCanonicalComposerProfileForCredit("Amaury Messelier")?.slug).toBe("arom");
    expect(getCanonicalComposerProfileForCredit("Charlotte Duran")?.slug).toBe("coeur");
    expect(getCanonicalComposerProfileForCredit("Tcheep")).toBeUndefined();
    expect(getCanonicalComposerProfileForCredit("Chicho Cortez")).toBeUndefined();
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
    expect(profiles.find((profile) => profile.slug === "pierre-millet")).toBeUndefined();
  });

  it("counts distinct main works and keeps variants separate from Artist metadata", () => {
    const profiles = collectCanonicalComposerSummaries([
      { id: "main", albumId: "album-1", albumCode: "PGO0001", albumTitle: "Album", composers: ["Victor Baillet"], artists: [{ name: "Aeon Seven", slug: "aeon-seven" }] },
      { id: "version", mainTrackId: "main", isAlternate: true, albumId: "album-1", albumCode: "PGO0001", albumTitle: "Album", composers: ["Victor Baillet"] },
      { id: "stem", mainTrackId: "main", isAlternate: true, albumId: "album-1", albumCode: "PGO0001", albumTitle: "Album", composers: ["Victor Baillet"] },
      { id: "orphan", isAlternate: true, albumId: "album-2", albumCode: "PGO0002", albumTitle: "Orphan", composers: ["Victor Baillet"] },
      { id: "artist-only", albumId: "album-3", albumCode: "PGO0003", albumTitle: "Artist only", composers: [], artists: [{ name: "Victor Baillet", slug: "victor-baillet" }] },
    ]);
    const victor = profiles.find((profile) => profile.slug === "victor-baillet");
    expect(victor).toMatchObject({ trackCount: 1, variantCount: 4, albumIds: ["album-1"] });
    expect(profiles.find((profile) => profile.slug === "aeon-seven")).toMatchObject({ trackCount: 0, variantCount: 0 });
  });
});
