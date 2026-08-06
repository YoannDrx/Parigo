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
    expect(canonicalComposerProfiles.filter((profile) => profile.imageStatus === "portrait" && profile.detailImage)).toHaveLength(55);
    expect(canonicalComposerProfiles.find((profile) => profile.slug === "loic-laporte")?.detailImage).toMatchObject({
      src: "/images/composers/detail/loic_laporte.webp",
      width: 450,
      height: 624,
    });
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
    for (const slug of ["aeon-seven", "after-in-paris", "ana-kap", "arom", "bruno-hovart", "daniel-amozig", "grand-david", "jb-hanak", "laurent-dury", "loic-laporte", "minimatic", "mister-modo", "modulhater", "of-ivory-and-horn", "patrice-dambrine", "stan-galouo", "the-architect", "the-well-quartet", "thierry-los", "ugly-mac-beer", "xavier-sibre"]) {
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

  it("maps collective members globally without hiding their individual profiles", () => {
    expect(getCanonicalComposerProfileForCredit("Franck Sinnassamy")?.slug).toBe("dj-hertz");
    expect(getCanonicalComposerProfileForCredit("Amaury Messelier (SACEM)")?.slug).toBe("arom");
    expect(getCanonicalComposerProfileForCredit("Jean-Michel Vallet", "PGO0031")?.slug).toBe("after-in-paris");
    expect(getCanonicalComposerProfileForCredit("Jean-Michel Vallet", "PGO0008")?.slug).toBe("after-in-paris");
    expect(getCanonicalComposerProfileForCredit("Claire Michael", "PGO0020")?.slug).toBe("after-in-paris");
    expect(getCanonicalComposerProfileForCredit("Patrick Chartol", "PGO0047")?.slug).toBe("after-in-paris");
    expect(getCanonicalComposerProfileForCredit("Patrick Chartol", "PGO0048")?.slug).toBe("after-in-paris");
    expect(getCanonicalComposerProfileForCredit("Vallet Jean-Michel", "PGO0031")?.slug).toBe("after-in-paris");
    expect(getCanonicalComposerProfileForCredit("Vallet Jean-Michel", "PGO0042")?.slug).toBe("after-in-paris");
    expect(getCanonicalComposerProfileForCredit("Jean-Michel Vallet")?.slug).toBe("after-in-paris");
    expect(getCanonicalComposerProfile("pierre-millet")).toBeUndefined();
    expect(getCanonicalComposerProfileForCredit("Pierre Millet", "PGO0034")?.slug).toBe("ana-kap");
    expect(getCanonicalComposerProfileForCredit("Pierre Millet", "PGO0046")?.slug).toBe("ana-kap");
    expect(resolveCanonicalComposerCredits("Pierre Millet", "PGO0034").map(({ profile }) => profile.slug)).toEqual(["ana-kap"]);
  });

  it("maps stage-name profiles and lets collective memberships span the full catalogue", () => {
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
    expect(getCanonicalComposerProfileForCredit("Samuel HIRSCH (NS)", "PGO0048")?.slug).toBe("arat-kilo");
    expect(getCanonicalComposerProfileForCredit("Fabien GIRARD (NS)")?.slug).toBe("fabien-girard");
    expect(resolveCanonicalComposerCredits("Fabien GIRARD (NS)").map(({ profile }) => profile.slug)).toEqual(["fabien-girard", "arat-kilo"]);
    expect(resolveCanonicalComposerCredits("Liqid", "PGO0035").map(({ profile }) => profile.slug)).toEqual(["liqid"]);
    expect(resolveCanonicalComposerCredits("Liqid", "PGO0040").map(({ profile }) => profile.slug)).toEqual(["liqid"]);
    expect(getCanonicalComposerProfileForCredit("The Well Quartet", "PGO0060")?.slug).toBe("the-well-quartet");
  });

  it("uses the requested public names for Le Grand David and JB Hanak", () => {
    expect(getCanonicalComposerProfile("grand-david")?.name).toBe("Le Grand David");
    expect(getCanonicalComposerProfileForCredit("Grand David")?.name).toBe("Le Grand David");
    expect(getCanonicalComposerProfile("jb-hanak")?.name).toBe("JB Hanak");
    expect(getCanonicalComposerProfileForCredit("Jean-Baptiste HANAK")?.name).toBe("JB Hanak");
    expect(getCanonicalComposerProfile("cedric-hanak")?.name).toBe("Cédric Hanak");
  });

  it("uses the requested public spelling and casing for composer names", () => {
    expect(Object.fromEntries(canonicalComposerProfiles.map((profile) => [profile.slug, profile.name]))).toMatchObject({
      aiwa: "Aïwa",
      "ana-kap": "Ana Kap",
      arom: "Arom",
      "daniel-amozig": "Dan Amozig",
      "dj-hertz": "DJ Hertz",
      "dj-troubl": "DJ Troubl",
      "loic-laporte": "Loïc Laporte",
      "of-ivory-and-horn": "Of Ivory & Horn",
      "sebastien-blanchon-n-zeng": "Sébastien Blanchon",
      "senior-ortegon": "Sr Ortegon",
      "the-well-quartet": "Le Well Quartet",
    });
    expect(getCanonicalComposerProfile("dj-troubl")?.bio.fr).not.toContain("Troubl'");
    expect(getCanonicalComposerProfile("dj-troubl")?.bio.en).not.toContain("Troubl'");
  });

  it("publishes Schérazade without her surname while preserving full-name credits", () => {
    expect(getCanonicalComposerProfile("scherazade-aissahine")?.name).toBe("Schérazade");
    expect(getCanonicalComposerProfileForCredit("Scherazade Aissahine")?.name).toBe("Schérazade");
    expect(getCanonicalComposerProfileForCredit("Schérazade Aissahine")?.slug).toBe("scherazade-aissahine");
  });

  it("records the exact high-resolution historical portraits restored from the portfolio", () => {
    expect(getCanonicalComposerProfile("sebastien-blanchon-n-zeng")?.provenance).toMatchObject({
      imageOverride: {
        source: "portfolio-caro-git",
        repository: "portfolio-caro",
        commit: "03a28ab9431751a42cd5d4d1a7a8bb3b8dd821e3",
        path: "public/images/projets/photoscompo/sebastienblanchon.jpg",
      },
    });
    expect(getCanonicalComposerProfile("the-real-fake-mc")?.provenance).toMatchObject({
      imageOverride: {
        source: "portfolio-caro-git",
        repository: "portfolio-caro",
        commit: "03a28ab9431751a42cd5d4d1a7a8bb3b8dd821e3",
        path: "public/images/projets/photoscompo/therealfakemc.jpg",
      },
    });
    expect(getCanonicalComposerProfile("cedric-hanak")?.provenance).toMatchObject({
      imageOverride: {
        source: "portfolio-caro-git",
        repository: "portfolio-caro",
        commit: "734441d8ad1280d538ae9b104bace0c9de6248a9",
        path: "public/images/projets/photoscompo/cedric-hanak.jpg",
      },
    });
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

  it("aggregates collective members on every album without creating individual profiles", () => {
    const profiles = collectCanonicalComposerSummaries([
      { id: "a", albumId: "1", albumCode: "PGO0031", albumTitle: "After", composers: ["Jean-Michel Vallet"] },
      { id: "b", albumId: "2", albumCode: "PGO0099", albumTitle: "Solo", composers: ["Jean-Michel Vallet"] },
      { id: "c", albumId: "3", albumCode: "PGO0034", albumTitle: "Ana", composers: ["Pierre Millet"] },
      { id: "d", albumId: "4", albumCode: "PGO0046", albumTitle: "Other", composers: ["Pierre Millet"] },
    ]);
    expect(profiles.find((profile) => profile.slug === "after-in-paris")?.trackCount).toBe(2);
    expect(profiles.find((profile) => profile.slug === "ana-kap")?.trackCount).toBe(2);
    expect(profiles.find((profile) => profile.slug === "pierre-millet")).toBeUndefined();
  });

  it("collects the five After In Paris albums attested by the Harvest member credits", () => {
    const codes = ["PGO0008", "PGO0020", "PGO0031", "PGO0047", "PGO0048"];
    const profiles = collectCanonicalComposerSummaries(codes.map((albumCode, index) => ({
      id: `after-${index}`,
      albumId: `album-${index}`,
      albumCode,
      albumTitle: `After ${index}`,
      composers: ["Jean-Michel Vallet", "Claire Michael", "Patrick Chartol"],
    })));
    expect(profiles.find((profile) => profile.slug === "after-in-paris")).toMatchObject({
      trackCount: 5,
      albumCodes: codes,
      albumIds: codes.map((_, index) => `album-${index}`),
    });
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
