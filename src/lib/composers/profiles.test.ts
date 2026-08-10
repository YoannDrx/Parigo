import { describe, expect, it } from "vitest";
import suppliedBiographies from "@/content/composer-sources/site-biographies.user-provided.json";
import {
  CANONICAL_COMPOSER_PROFILE_COUNT,
  canonicalComposerProfiles,
  collectCanonicalComposerSummaries,
  getCanonicalComposerProfile,
  getCanonicalComposerProfileForCredit,
  resolveCanonicalComposerCredit,
  resolveCanonicalComposerCredits,
} from "./profiles";

describe("canonical composer registry", () => {
  it("contains exactly the 62 unique public profiles", () => {
    expect(CANONICAL_COMPOSER_PROFILE_COUNT).toBe(62);
    expect(canonicalComposerProfiles).toHaveLength(62);
    expect(new Set(canonicalComposerProfiles.map((profile) => profile.slug))).toHaveLength(62);
    expect(new Set(canonicalComposerProfiles.map((profile) => profile.name))).toHaveLength(62);
    expect(canonicalComposerProfiles.filter((profile) => profile.imageStatus === "portrait" && profile.detailImage)).toHaveLength(62);
    expect(canonicalComposerProfiles.find((profile) => profile.slug === "loic-laporte")?.detailImage).toMatchObject({
      src: "/images/composers/detail/loic_laporte.webp",
      width: 450,
      height: 624,
    });
  });

  it("keeps every biography and portrait as a dated local editorial source", () => {
    const withoutBio = canonicalComposerProfiles
      .filter((profile) => profile.bio.fr === null && profile.bio.en === null)
      .map((profile) => profile.name);
    expect(withoutBio).toEqual([]);
    expect(canonicalComposerProfiles.filter((profile) => profile.bio.fr && profile.bio.en)).toHaveLength(62);
    expect(canonicalComposerProfiles.every((profile) => profile.provenance.source === "local-editorial")).toBe(true);
    expect(canonicalComposerProfiles.every((profile) => profile.provenance.biographyFile === "site-biographies.user-provided.json")).toBe(true);
  });

  it("publishes the supplied biographies verbatim and records local portraits", () => {
    expect(Object.keys(suppliedBiographies.profiles)).toHaveLength(62);
    for (const [slug, biography] of Object.entries(suppliedBiographies.profiles)) {
      expect(canonicalComposerProfiles.find((profile) => profile.slug === slug)?.bio).toEqual({
        fr: biography.fr,
        en: biography.en,
      });
    }
    expect(canonicalComposerProfiles.find((profile) => profile.slug === "forever-pavot")?.provenance.portraitFile).toBe("forever_pavot.jpg");
    expect(canonicalComposerProfiles.find((profile) => profile.slug === "dj-troubl")?.provenance.portraitFile).toBe("dj_troubl.jpg");
    expect(canonicalComposerProfiles.find((profile) => profile.slug === "aiwa")?.provenance.portraitFile).toBe("aiwa.jpg");
    expect(canonicalComposerProfiles.find((profile) => profile.slug === "arat-kilo")?.provenance.portraitFile).toBe("arat_kilo.jpeg");
    expect(canonicalComposerProfiles.find((profile) => profile.slug === "vincent-bouhelier")?.provenance.portraitFile).toBe("public/images/composers/detail/vincent_bouhelier.webp");
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
    expect(resolveCanonicalComposerCredits("Fabien GIRARD (NS)").map(({ profile }) => profile.slug)).toEqual(["fabien-girard"]);
    expect(resolveCanonicalComposerCredits("Fabien GIRARD (NS)", "PGO0030").map(({ profile }) => profile.slug)).toEqual(["fabien-girard", "arat-kilo"]);
    expect(resolveCanonicalComposerCredits("Fabien GIRARD", "PGO0055").map(({ profile }) => profile.slug)).toEqual(["fabien-girard"]);
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

  it("publishes Offset Prod while mapping Nicolas Pisani to his Harvest credit", () => {
    expect(getCanonicalComposerProfile("nicolas-pisani")?.name).toBe("Offset Prod");
    expect(getCanonicalComposerProfileForCredit("Nicolas Pisani")?.slug).toBe("nicolas-pisani");
    expect(collectCanonicalComposerSummaries([{
      id: "brand-content-main",
      albumId: "25044b5c93c08771",
      albumCode: "PGO0043",
      albumTitle: "Brand Content",
      composers: ["Franck SINNASSAMY", "Nicolas Pisani"],
    }]).find((profile) => profile.slug === "nicolas-pisani")).toMatchObject({
      trackCount: 1,
      albumIds: ["25044b5c93c08771"],
      albumCodes: ["PGO0043"],
      albumTitles: ["Brand Content"],
    });
  });

  it("maps Tcheep, Chicho Cortez, Blanka and Gerz to their exact Harvest credits", () => {
    expect(getCanonicalComposerProfileForCredit("Tcheep (NS)")?.slug).toBe("tcheep");
    expect(getCanonicalComposerProfileForCredit("Chicho Cortez (SACEM)")?.slug).toBe("chicho-cortez");
    expect(getCanonicalComposerProfileForCredit("Blanka")?.slug).toBe("blanka");
    expect(getCanonicalComposerProfileForCredit("Blankalfe (NS)")?.slug).toBe("blanka");
    expect(getCanonicalComposerProfileForCredit("Gerz Marcellino (SACEM)")?.slug).toBe("gerz");
    expect(getCanonicalComposerProfileForCredit("NSDOS")?.slug).toBe("nsdos");
    expect(getCanonicalComposerProfileForCredit("Brice Torres (SACEM)")?.slug).toBe("nsdos");
    expect(getCanonicalComposerProfileForCredit("Kirikoo Des")).toBeUndefined();

    const summaries = collectCanonicalComposerSummaries([
      {
        id: "arcade-mode-main",
        albumId: "2513d961b12a4144",
        albumCode: "PGO0032",
        albumTitle: "Diggin Hip-Hop Vol.2",
        composers: ["Tcheep (NS)"],
      },
      {
        id: "dark-knight-main",
        albumId: "a115a18d4db049ea",
        albumCode: "PGO0024",
        albumTitle: "Caught In The Trap",
        composers: ["Bonetrips (SACEM)", "Liqid (SACEM)", "Chicho Cortez (SACEM)"],
      },
      {
        id: "adriatic-sunrise-main",
        albumId: "fad15b61a412b1a7",
        albumCode: "PGO0051",
        albumTitle: "Lofi Hip Hop",
        composers: ["Bonetrips", "Chicho Cortez", "Tcheep"],
      },
      {
        id: "where-u-ah-main",
        albumId: "2513d961b12a4144",
        albumCode: "PGO0032",
        albumTitle: "Diggin Hip-Hop Vol.2",
        composers: ["Blankalfe (NS)"],
      },
      {
        id: "hey-boy-main",
        albumId: "a115a18d4db049ea",
        albumCode: "PGO0024",
        albumTitle: "Caught In The Trap",
        composers: ["Ugly Mac Beer (SACEM)", "Gerz Marcellino (SACEM)"],
      },
      {
        id: "take-off-nsdos-rework-main",
        albumId: "5b425421282dc96d",
        albumCode: "PGO0049",
        albumTitle: "Odyssey Suites And Remixes",
        composers: ["Sebastien Blanchon (SACEM)", "Brice Torres (SACEM)"],
      },
    ]);

    expect(summaries.find((profile) => profile.slug === "tcheep")).toMatchObject({
      trackCount: 2,
      albumCodes: ["PGO0032", "PGO0051"],
      albumTitles: ["Diggin Hip-Hop Vol.2", "Lofi Hip Hop"],
    });
    expect(summaries.find((profile) => profile.slug === "chicho-cortez")).toMatchObject({
      trackCount: 2,
      albumCodes: ["PGO0024", "PGO0051"],
      albumTitles: ["Caught In The Trap", "Lofi Hip Hop"],
    });
    expect(summaries.find((profile) => profile.slug === "blanka")).toMatchObject({
      trackCount: 1,
      albumCodes: ["PGO0032"],
      albumTitles: ["Diggin Hip-Hop Vol.2"],
    });
    expect(summaries.find((profile) => profile.slug === "gerz")).toMatchObject({
      name: "Gerz Marcellino",
      trackCount: 1,
      albumCodes: ["PGO0024"],
      albumTitles: ["Caught In The Trap"],
    });
    expect(summaries.find((profile) => profile.slug === "nsdos")).toMatchObject({
      name: "NSDOS",
      trackCount: 1,
      albumCodes: ["PGO0049"],
      albumTitles: ["Odyssey Suites And Remixes"],
    });
  });

  it("uses the requested public spelling and casing for composer names", () => {
    expect(Object.fromEntries(canonicalComposerProfiles.map((profile) => [profile.slug, profile.name]))).toMatchObject({
      aiwa: "Aïwa",
      "ana-kap": "Ana Kap",
      arom: "Arom",
      "daniel-amozig": "Dan Amozig",
      "dj-hertz": "DJ Hertz",
      "dj-troubl": "DJ Troubl",
      gerz: "Gerz Marcellino",
      "nicolas-pisani": "Offset Prod",
      "yann-lean": "Yann Lean",
      "loic-laporte": "Loïc Laporte",
      nsdos: "NSDOS",
      "of-ivory-and-horn": "Of Ivory & Horn",
      "sebastien-blanchon-n-zeng": "Sébastien Blanchon",
      "senior-ortegon": "Sr Ortegon",
      "the-well-quartet": "Le Well Quartet",
    });
    expect(getCanonicalComposerProfile("dj-troubl")?.bio.fr).toContain("DJ Troubl'");
    expect(getCanonicalComposerProfile("dj-troubl")?.bio.en).toContain("DJ Troubl'");
  });

  it("publishes Schérazade without her surname while preserving full-name credits", () => {
    expect(getCanonicalComposerProfile("scherazade-aissahine")?.name).toBe("Schérazade");
    expect(getCanonicalComposerProfileForCredit("Scherazade Aissahine")?.name).toBe("Schérazade");
    expect(getCanonicalComposerProfileForCredit("Schérazade Aissahine")?.slug).toBe("scherazade-aissahine");
  });

  it("rattache les crédits d’autrice de Schérazade à sa discographie", () => {
    expect(collectCanonicalComposerSummaries([{
      id: "synthwave-song",
      albumId: "48b4b95fe1f09019",
      albumCode: "PGO0053",
      albumTitle: "Synthwave Retrowave",
      composers: ["Franck SINNASSAMY"],
      authors: ["Scherazade Aissahine"],
    }]).find((profile) => profile.slug === "scherazade-aissahine")).toMatchObject({
      trackCount: 1,
      albumIds: ["48b4b95fe1f09019"],
      albumCodes: ["PGO0053"],
      albumTitles: ["Synthwave Retrowave"],
    });
  });

  it("keeps restored high-resolution portraits as Parigo-owned files", () => {
    expect(getCanonicalComposerProfile("sebastien-blanchon-n-zeng")?.provenance.portraitFile).toBe("sebastien_blanchon.jpg");
    expect(getCanonicalComposerProfile("the-real-fake-mc")?.provenance.portraitFile).toBe("the_real_fake_mc.jpg");
  });

  it("keeps remaining Mutant Ninja contributors as unlinked credits when they have no public profile", () => {
    expect(getCanonicalComposerProfile("mutant-ninja")).toBeUndefined();
    expect(getCanonicalComposerProfileForCredit("Liqid")?.slug).toBe("liqid");
    expect(getCanonicalComposerProfileForCredit("Bonetrips")?.slug).toBe("bonetrips");
    expect(getCanonicalComposerProfileForCredit("Amaury Messelier")?.slug).toBe("arom");
    expect(getCanonicalComposerProfileForCredit("Charlotte Duran")?.slug).toBe("coeur");
    expect(getCanonicalComposerProfileForCredit("Tcheep")?.slug).toBe("tcheep");
    expect(getCanonicalComposerProfileForCredit("Chicho Cortez")?.slug).toBe("chicho-cortez");
  });

  it("exposes the preferred Harvest identity without merging distinct credited names", () => {
    expect(resolveCanonicalComposerCredit("Molenat Alexis (SACEM)", "PGO0033")?.identity.preferredName).toBe("Alexis Molenat");
    expect(resolveCanonicalComposerCredit("Flore Morchin (SACEM)", "PGO0049")?.identity.preferredName).toBe("Flore Morfin");
    expect(resolveCanonicalComposerCredit("N’Zeng (SACEM)", "PGO0049")?.identity.preferredName).toBe("N Zeng");
    expect(resolveCanonicalComposerCredit("Sebastien Blanchon (SACEM)", "PGO0049")?.identity.preferredName).toBe("Sébastien Blanchon");
    expect(resolveCanonicalComposerCredit("Claire Michael", "PGO0031")?.identity.preferredName).toBe("Claire Michael");
    expect(resolveCanonicalComposerCredit("Jean-Michel Vallet", "PGO0031")?.identity.preferredName).toBe("Jean-Michel Vallet");
  });

  it("limits collective members to validated albums without hiding individual profiles", () => {
    const profiles = collectCanonicalComposerSummaries([
      { id: "a", albumId: "1", albumCode: "PGO0030", albumTitle: "Afrobeat", composers: ["Fabien Girard"] },
      { id: "b", albumId: "2", albumCode: "PGO0055", albumTitle: "The World Wedding March", composers: ["Fabien Girard"] },
    ]);
    expect(profiles.find((profile) => profile.slug === "arat-kilo")).toMatchObject({
      trackCount: 1,
      albumCodes: ["PGO0030"],
    });
    expect(profiles.find((profile) => profile.slug === "fabien-girard")).toMatchObject({
      trackCount: 2,
      albumCodes: ["PGO0030", "PGO0055"],
    });
  });

  it("matches a talent from a stable Harvest right-holder ID when free text is absent", () => {
    const scherazade = canonicalComposerProfiles.find((profile) => profile.slug === "scherazade-aissahine");
    expect(scherazade?.harvest.rightHolderIds).toContain("d906147cf941b552");
    expect(collectCanonicalComposerSummaries([{
      id: "synthwave-vocal",
      albumId: "48b4b95fe1f09019",
      albumCode: "PGO0053",
      albumTitle: "Synthwave Retrowave",
      composers: ["Franck SINNASSAMY"],
      rightHolderIds: ["d906147cf941b552"],
    }]).find((profile) => profile.slug === "scherazade-aissahine")).toMatchObject({
      trackCount: 1,
      albumCodes: ["PGO0053"],
    });
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
