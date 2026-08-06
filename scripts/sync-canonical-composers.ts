import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";

const PORTFOLIO_COMMIT = "02e173bb95e0481e0dee29c3b2d6b3a8ca01e8e2";
const PORTFOLIO_API_ORIGIN = "https://synck-psi.vercel.app";
const THIERRY_IMAGE_GIT_REF = "890a906^";
const THIERRY_IMAGE_PATH = "public/images/projets/photoscompo/thierry-los.jpeg";
const CANONICAL_PROFILE_COUNT = 55;

type ProfileSource = {
  slug: string;
  name: string;
  kind: "person" | "group";
  bioSlug: string | null;
  imageSlug: string | null;
  imageFile?: string;
  localImageFile?: string;
  localImageProvenance?: {
    source: "portfolio-caro-git";
    repository: "portfolio-caro";
    commit: string;
    path: string;
  };
  aliases: string[];
  scopedRelations?: Array<{ albumCodes: string[]; aliases: string[] }>;
  creditIdentities?: Array<{ preferredName: string; aliases: string[]; albumCodes?: string[] }>;
  legacySlugs?: string[];
  editorialArtistSlug?: string;
  apiSource?: { slug: string };
  manualBioFile?: string;
};

type PortfolioArtist = {
  slug: string;
  image: string;
};

type PortfolioApiArtist = PortfolioArtist & {
  name: string;
  bio: string;
};

type PortfolioApiSnapshot = {
  capturedAt: string;
  urls: { fr: string; en: string };
  artists: { fr: PortfolioApiArtist; en: PortfolioApiArtist };
};

type UserProvidedBiography = {
  sourceFile: string;
  fr: string;
  en: string;
};

type UserProvidedBiographyRegistry = {
  capturedAt: string;
  profiles: Record<string, UserProvidedBiography>;
};

const USER_PROVIDED_BIOGRAPHIES_FILE = "site-biographies.user-provided.json";

const profiles: ProfileSource[] = [
  {
    slug: "aiwa",
    name: "Aiwa",
    kind: "group",
    bioSlug: "aiwa",
    imageSlug: "aiwa",
    aliases: ["Naufalle Al Wahab", "Al Wahab Naufalle", "Wamid Al Wahab", "Al Wahab Wamid"],
    creditIdentities: [
      { preferredName: "Naufalle Al Wahab", aliases: ["Naufalle Al Wahab", "Al Wahab Naufalle"] },
      { preferredName: "Wamid Al Wahab", aliases: ["Wamid Al Wahab", "Al Wahab Wamid"] },
    ],
  },
  {
    slug: "arat-kilo",
    name: "Arat Kilo",
    kind: "group",
    bioSlug: "arat-kilo",
    imageSlug: "arat-kilo",
    aliases: [],
    scopedRelations: [{
      albumCodes: ["PGO0030"],
      aliases: [
        "Samuel Hirsch", "Florent Berteau", "Fabien Girard", "Gerald Bonnegrace", "Michael Havard",
        "Aristide Goncalves", "Arnold Turpin", "Camille Floriot", "Assitan Keita", "Mike Ladd",
        "Nardos Tesfaw", "ROCE", "Bruck Tesfaye",
      ],
    }],
  },
  { slug: "fabien-girard", name: "Fabien Girard", kind: "person", bioSlug: "fabien-girard", imageSlug: "fabien-girard", aliases: ["Fabien Girard"] },
  { slug: "xavier-sibre", name: "Xavier Sibre", kind: "person", bioSlug: null, imageSlug: null, aliases: ["Xavier Sibre"] },
  { slug: "ugly-mac-beer", name: "Ugly Mac Beer", kind: "person", bioSlug: "ugly-mac-beer", imageSlug: "ugly-mac-beer", localImageFile: "ugly_mac_beer.jpg", aliases: ["Ugly Mac Beer"] },
  { slug: "yann-kornowicz", name: "Yann Kornowicz", kind: "person", bioSlug: "yann-kornowicz", imageSlug: "yann-kornowicz", aliases: ["Yann Kornowicz"] },
  { slug: "dj-hertz", name: "DJ HERTZ", kind: "person", bioSlug: "dj-hertz", imageSlug: "dj-hertz", aliases: ["Franck Sinnassamy", "DJ HERTZ"], legacySlugs: ["franck-sinnassamy"] },
  { slug: "laurent-dury", name: "Laurent Dury", kind: "person", bioSlug: "laurent-dury", imageSlug: "laurent-dury", localImageFile: "laurent_dury.png", aliases: ["Laurent Dury"] },
  { slug: "liqid", name: "Liqid", kind: "person", bioSlug: "liqid", imageSlug: "liqid", aliases: ["Liqid"] },
  { slug: "bonetrips", name: "Bonetrips", kind: "person", bioSlug: "bonetrips", imageSlug: "bonetrips", aliases: ["Bonetrips"] },
  { slug: "coeur", name: "Cœur", kind: "person", bioSlug: "coeur", imageSlug: "coeur", aliases: ["Charlotte Duran"] },
  { slug: "arom", name: "AROM", kind: "person", bioSlug: "arom", imageSlug: "arom", aliases: ["Amaury Messelier", "AROM"], legacySlugs: ["amaury-messelier"] },
  { slug: "minimatic", name: "Minimatic", kind: "person", bioSlug: "minimatic", imageSlug: "minimatic", aliases: ["Minimatic"] },
  {
    slug: "sebastien-blanchon-n-zeng",
    name: "Sébastien Blanchon (N’Zeng)",
    kind: "person",
    bioSlug: "sebastien-blanchon",
    imageSlug: "sebastien-blanchon",
    localImageFile: "sebastien_blanchon.jpg",
    localImageProvenance: {
      source: "portfolio-caro-git",
      repository: "portfolio-caro",
      commit: "03a28ab9431751a42cd5d4d1a7a8bb3b8dd821e3",
      path: "public/images/projets/photoscompo/sebastienblanchon.jpg",
    },
    aliases: ["Sébastien Blanchon", "Sebastien Blanchon", "N Zeng", "N’Zeng", "N'Zeng"],
    creditIdentities: [
      { preferredName: "Sébastien Blanchon", aliases: ["Sébastien Blanchon", "Sebastien Blanchon"] },
      { preferredName: "N Zeng", aliases: ["N Zeng", "N’Zeng", "N'Zeng"] },
    ],
    legacySlugs: ["sebastien-blanchon", "n-zeng"],
  },
  { slug: "drixxxe", name: "Drixxxé", kind: "person", bioSlug: "drixxxe", imageSlug: "drixxxe", aliases: ["Drixxxé", "Drixxxe"] },
  { slug: "emmanuel-maree", name: "Emmanuel Marée", kind: "person", bioSlug: "emmanuel-maree", imageSlug: "emmanuel-maree", aliases: ["Emmanuel Marée"] },
  { slug: "f-stokes", name: "F.Stokes", kind: "person", bioSlug: "f-stokes", imageSlug: "f-stokes", aliases: ["Rodney Lucas"] },
  { slug: "forever-pavot", name: "Forever Pavot", kind: "person", bioSlug: "emile-sornin-forever-pavot", imageSlug: "emile-sornin-forever-pavot", aliases: ["Emile Sornin", "Sornin Emile"], editorialArtistSlug: "emile-sornin-forever-pavot" },
  { slug: "frederic-hanak", name: "Frédéric Hanak", kind: "person", bioSlug: null, imageSlug: "frederic-hanak", aliases: ["Frédéric Hanak", "Frederic Hanak"], manualBioFile: "frederic-hanak.user-provided.json" },
  { slug: "madben", name: "Madben", kind: "person", bioSlug: "madben", imageSlug: "madben", aliases: ["Madben"] },
  { slug: "arandel", name: "Arandel", kind: "person", bioSlug: "arandel", imageSlug: "arandel", aliases: ["Arandel"] },
  { slug: "the-architect", name: "The Architect", kind: "person", bioSlug: "the-architect", imageSlug: "the-architect", aliases: ["The Architect"] },
  {
    slug: "after-in-paris",
    name: "After In Paris",
    kind: "group",
    bioSlug: "after-in-paris",
    imageSlug: "after-in-paris",
    localImageFile: "after_in_paris.jpg",
    aliases: [],
    scopedRelations: [{ albumCodes: ["PGO0031"], aliases: ["Jean-Michel Vallet", "Claire Michael", "Patrick Chartol", "After In Paris"] }],
  },
  { slug: "thierry-los", name: "Thierry Los", kind: "person", bioSlug: null, imageSlug: null, localImageFile: "thierry_los.jpg", aliases: ["Thierry Loshouarn", "Thierry Los"] },
  { slug: "nicodrum", name: "Nicodrum", kind: "person", bioSlug: "nicodrums-friends", imageSlug: "nicodrums-friends", aliases: ["Nicodrum", "Nicodrums", "Nicodrums & Friends", "Nicodrums Friends"], legacySlugs: ["nicodrums-friends"] },
  { slug: "2080", name: "2080", kind: "person", bioSlug: "2080", imageSlug: "2080", aliases: ["2080", "208"] },
  { slug: "jb-hanak", name: "JB Hanak", kind: "person", bioSlug: "jb-hanak", imageSlug: "jb-hanak", aliases: ["Jean-Baptiste Hanak", "Jean Baptiste Hanak", "JB HANAK"] },
  { slug: "aeon-seven", name: "Aeon Seven", kind: "person", bioSlug: "aeon-seven", imageSlug: "aeon-seven", aliases: ["Stéphane Delplanque", "Stephane Delplanque"], editorialArtistSlug: "aeon-seven" },
  { slug: "daniel-amozig", name: "Daniel Amozig", kind: "person", bioSlug: "dan-amozig", imageSlug: "dan-amozig", aliases: ["Daniel Amozig", "Dan Amozig"], legacySlugs: ["dan-amozig"] },
  { slug: "yann-jankielewicz", name: "Yann Jankielewicz", kind: "person", bioSlug: "yann-jankielewicz", imageSlug: "yann-jankielewicz", aliases: ["Yann Jankielewicz"] },
  { slug: "victor-baillet", name: "Victor Baillet", kind: "person", bioSlug: "mr-viktor", imageSlug: "mr-viktor", localImageFile: "victor_baillet.jpg", aliases: ["Victor Baillet"], editorialArtistSlug: "mr-viktor" },
  { slug: "vincent-bouhelier", name: "Vincent Bouhelier", kind: "person", bioSlug: "aociz", imageSlug: "aociz", aliases: ["Vincent Bouhelier"], editorialArtistSlug: "aociz" },
  {
    slug: "ana-kap",
    name: "ANA KAP",
    kind: "group",
    bioSlug: "ana-kap",
    imageSlug: "ana-kap",
    aliases: [],
    scopedRelations: [{ albumCodes: ["PGO0034"], aliases: ["Emin Dzijan", "Manuel Decocq", "Pierre Millet", "Jean-Michel Trotoux", "ANA KAP"] }],
  },
  { slug: "alexis-molenat", name: "Alexis Molenat", kind: "person", bioSlug: "alexis-molenat-les-cavaliers", imageSlug: "alexis-molenat-les-cavaliers", aliases: ["Alexis Molenat", "Molenat Alexis"], legacySlugs: ["alexis-molenat-les-cavaliers"] },
  { slug: "maxime-raynier", name: "Maxime Raynier", kind: "person", bioSlug: "maxime-raynier-les-arondes", imageSlug: "maxime-raynier-les-arondes", aliases: ["Maxime Raynier", "Raynier Maxime"], legacySlugs: ["maxime-raynier-les-arondes"] },
  { slug: "patrice-dambrine", name: "Patrice Dambrine", kind: "person", bioSlug: "patrice-dambrine-viro-major-records", imageSlug: "patrice-dambrine-viro-major-records", localImageFile: "patrice_dambrine.jpg", aliases: ["Patrice Dambrine", "Dambrine Patrice"], legacySlugs: ["patrice-dambrine-viro-major-records"] },
  { slug: "bruno-hovart", name: "Bruno Hovart", kind: "person", bioSlug: "bruno-hovart", imageSlug: "bruno-hovart", aliases: ["Bruno Hovart"] },
  { slug: "senior-ortegon", name: "Senior Ortegon", kind: "person", bioSlug: "sr-ortegon", imageSlug: "sr-ortegon", aliases: ["Senior Ortegon", "SR Ortegon"], legacySlugs: ["sr-ortegon"] },
  { slug: "stan-galouo", name: "Stan Galouo", kind: "person", bioSlug: null, imageSlug: "stan-galouo-palma-coco-reccords", localImageFile: "stan_galouo.png", aliases: ["Stan Galouo"], legacySlugs: ["stan-galouo-palma-coco-reccords"] },
  { slug: "modulhater", name: "Modulhater", kind: "person", bioSlug: "modulhater", imageSlug: "modulhater", aliases: ["Modulhater"] },
  { slug: "ducer", name: "Ducer", kind: "person", bioSlug: "ducer", imageSlug: "ducer", aliases: ["Ducer"] },
  { slug: "dj-troubl", name: "DJ TRoubl", kind: "person", bioSlug: "dj-troubl", imageSlug: "dj-troubl", aliases: ["DJ TRoubl", "DJ Troubl"] },
  { slug: "of-ivory-and-horn", name: "Of Ivory And Horn", kind: "group", bioSlug: "of-ivory-horn", imageSlug: "of-ivory-horn", aliases: ["Of Ivory And Horn", "Of Ivory & Horn"], legacySlugs: ["of-ivory-horn"] },
  { slug: "mister-modo", name: "Mister Modo", kind: "person", bioSlug: "mister-modo", imageSlug: "mister-modo", aliases: ["Mister Modo"] },
  { slug: "grand-david", name: "Le Grand David", kind: "person", bioSlug: "grand-david", imageSlug: "grand-david", aliases: ["Grand David", "Le Grand David"] },
  { slug: "jean-pierre-menager", name: "Jean Pierre Ménager", kind: "person", bioSlug: "jean-pierre-menager", imageSlug: "jean-pierre-menager", aliases: ["Jean Pierre Ménager", "Jean-Pierre Ménager", "Jean Pierre Menager"] },
  { slug: "loic-laporte", name: "Loic Laporte", kind: "person", bioSlug: null, imageSlug: null, aliases: ["Loic Laporte", "Loïc Laporte"] },
  { slug: "cyril-laurent", name: "Cyril Laurent", kind: "person", bioSlug: "cyril-laurent", imageSlug: "cyril-laurent", aliases: ["Cyril Laurent"] },
  { slug: "charlotte-savary", name: "Charlotte Savary", kind: "person", bioSlug: "charlotte-savary", imageSlug: "charlotte-savary", aliases: ["Charlotte Savary"] },
  { slug: "scherazade-aissahine", name: "Schérazade", kind: "person", bioSlug: null, imageSlug: "scherazade", aliases: ["Scherazade Aissahine", "Schérazade Aissahine"], legacySlugs: ["scherazade"] },
  { slug: "roma-luca", name: "Roma Luca", kind: "person", bioSlug: null, imageSlug: "roma-luca", aliases: ["Camille Luca"] },
  {
    slug: "the-real-fake-mc",
    name: "The Real Fake MC",
    kind: "person",
    bioSlug: null,
    imageSlug: "the-real-fake-mc",
    localImageFile: "the_real_fake_mc.jpg",
    localImageProvenance: {
      source: "portfolio-caro-git",
      repository: "portfolio-caro",
      commit: "03a28ab9431751a42cd5d4d1a7a8bb3b8dd821e3",
      path: "public/images/projets/photoscompo/therealfakemc.jpg",
    },
    aliases: ["The Real Fake MC"],
  },
  {
    slug: "the-well-quartet",
    name: "The Well Quartet",
    kind: "group",
    bioSlug: "well-quartet",
    imageSlug: "well-quartet",
    aliases: [],
    editorialArtistSlug: "well-quartet",
    scopedRelations: [{ albumCodes: ["PGO0060"], aliases: ["The Well Quartet", "Well Quartet"] }],
  },
  {
    slug: "flore",
    name: "Flore",
    kind: "person",
    bioSlug: "flore",
    imageSlug: "flore",
    aliases: ["Flore", "Flore Morfin", "Flore Morchin"],
    creditIdentities: [{ preferredName: "Flore Morfin", aliases: ["Flore Morfin", "Flore Morchin", "Flore"] }],
  },
  { slug: "cedric-hanak", name: "Cédric Hanak", kind: "person", bioSlug: "cedric-hanak", imageSlug: "cedric-hanak", localImageFile: "cedric_hanak.jpg", aliases: ["Cédric Hanak", "Cedric Hanak", "Cédric HANAK"] },
];

const root = process.cwd();
const portfolioRoot = process.env.PORTFOLIO_CARO_ROOT
  ? path.resolve(process.env.PORTFOLIO_CARO_ROOT)
  : path.resolve(root, "../portfolio-caro");
const execFileAsync = promisify(execFile);

async function portfolioHead(): Promise<string> {
  const { stdout } = await execFileAsync("git", ["-C", portfolioRoot, "rev-parse", "HEAD"]);
  return stdout.trim();
}

async function readBio(locale: "fr" | "en", slug: string | null): Promise<string | null> {
  if (!slug) return null;
  const source = path.join(portfolioRoot, "content/artist-bios", locale, `${slug}.md`);
  const value = await readFile(source, "utf8");
  return value.trim().replace(/^https:\/\/\S+\s*/i, "").trim() || null;
}

async function readManualBio(file: string): Promise<{ fr: string; en: string }> {
  const source = path.join(root, "src/content/composer-sources", file);
  const value = JSON.parse(await readFile(source, "utf8")) as { fr?: unknown; en?: unknown };
  if (typeof value.fr !== "string" || !value.fr.trim() || typeof value.en !== "string" || !value.en.trim()) {
    throw new Error(`Bio manuelle FR/EN invalide : ${file}`);
  }
  return { fr: value.fr.trim(), en: value.en.trim() };
}

async function readUserProvidedBiographies(): Promise<UserProvidedBiographyRegistry> {
  const source = path.join(root, "src/content/composer-sources", USER_PROVIDED_BIOGRAPHIES_FILE);
  const value = JSON.parse(await readFile(source, "utf8")) as Partial<UserProvidedBiographyRegistry>;
  if (typeof value.capturedAt !== "string" || Number.isNaN(Date.parse(value.capturedAt)) || !value.profiles) {
    throw new Error(`Registre de biographies fourni invalide : ${USER_PROVIDED_BIOGRAPHIES_FILE}`);
  }
  for (const [slug, biography] of Object.entries(value.profiles)) {
    if (!profiles.some((profile) => profile.slug === slug)) throw new Error(`Bio fournie sans profil canonique : ${slug}`);
    if (
      typeof biography?.sourceFile !== "string" || !biography.sourceFile.trim()
      || typeof biography.fr !== "string" || !biography.fr.trim()
      || typeof biography.en !== "string" || !biography.en.trim()
    ) {
      throw new Error(`Bio fournie FR/EN invalide : ${slug}`);
    }
  }
  return value as UserProvidedBiographyRegistry;
}

function imageOverride(profile: ProfileSource) {
  if (!profile.localImageFile) return undefined;
  return profile.localImageProvenance
    ? { ...profile.localImageProvenance, file: profile.localImageFile }
    : { source: "user-provided" as const, file: profile.localImageFile };
}

function composerPortraitFilename(slug: string): string {
  return `${slug.replaceAll("-", "_")}.webp`;
}

async function fetchPortfolioArtist(locale: "fr" | "en", slug: string): Promise<PortfolioApiArtist> {
  const url = `${PORTFOLIO_API_ORIGIN}/api/artists?locale=${locale}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Portfolio API ${locale} indisponible (${response.status}) : ${url}`);
  const artists = await response.json() as PortfolioApiArtist[];
  const artist = artists.find((item) => item.slug === slug);
  if (!artist?.bio || !artist.image) throw new Error(`Artiste Portfolio API introuvable ou incomplet : ${slug} (${locale})`);
  return artist;
}

async function loadPortfolioApiSnapshot(slug: string): Promise<PortfolioApiSnapshot> {
  const snapshotPath = path.join(root, "src/content/composer-sources", `${slug}.portfolio-api.json`);
  const urls = {
    fr: `${PORTFOLIO_API_ORIGIN}/api/artists?locale=fr`,
    en: `${PORTFOLIO_API_ORIGIN}/api/artists?locale=en`,
  };
  try {
    const [fr, en] = await Promise.all([fetchPortfolioArtist("fr", slug), fetchPortfolioArtist("en", slug)]);
    const snapshot = { capturedAt: new Date().toISOString(), urls, artists: { fr, en } };
    await mkdir(path.dirname(snapshotPath), { recursive: true });
    await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
    return snapshot;
  } catch (error) {
    try {
      return JSON.parse(await readFile(snapshotPath, "utf8")) as PortfolioApiSnapshot;
    } catch {
      throw error;
    }
  }
}

async function readPortfolioGitAsset(ref: string, sourcePath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    execFile(
      "git",
      ["-C", portfolioRoot, "show", `${ref}:${sourcePath}`],
      { encoding: "buffer", maxBuffer: 20 * 1024 * 1024 },
      (error, stdout) => error ? reject(error) : resolve(Buffer.from(stdout)),
    );
  });
}

function publicBiography(value: string | null): string | null {
  if (!value) return null;
  return value
    .replace(/\bMr[ .]?Viktor\b/gi, "Victor Baillet")
    .replace(/\bAociz\b/gi, "Vincent Bouhelier")
    .replace(/\bCharlie Duran\b/gi, "Charlotte Duran");
}

async function main() {
  const head = await portfolioHead();
  if (head !== PORTFOLIO_COMMIT) {
    throw new Error(`Portfolio Caro doit être positionné sur ${PORTFOLIO_COMMIT}, commit courant : ${head}`);
  }
  if (profiles.length !== CANONICAL_PROFILE_COUNT) throw new Error(`Le registre doit contenir ${CANONICAL_PROFILE_COUNT} profils, reçu : ${profiles.length}`);
  const duplicateSlugs = profiles.filter((profile, index) => profiles.findIndex((item) => item.slug === profile.slug) !== index);
  if (duplicateSlugs.length) throw new Error(`Slugs dupliqués : ${duplicateSlugs.map((item) => item.slug).join(", ")}`);

  const artists = JSON.parse(await readFile(path.join(portfolioRoot, "seed-data/artists.json"), "utf8")) as PortfolioArtist[];
  const artistsBySlug = new Map(artists.map((artist) => [artist.slug, artist]));
  const providedBiographies = await readUserProvidedBiographies();
  const outputAssets = path.join(root, "public/images/composers/canonical");
  await mkdir(outputAssets, { recursive: true });

  const output = [];
  for (const profile of profiles) {
    const apiSnapshot = profile.apiSource ? await loadPortfolioApiSnapshot(profile.apiSource.slug) : null;
    const [apiFr, apiEn] = apiSnapshot ? [apiSnapshot.artists.fr, apiSnapshot.artists.en] : [null, null];
    const providedBio = providedBiographies.profiles[profile.slug] ?? null;
    const manualBio = providedBio ?? (profile.manualBioFile ? await readManualBio(profile.manualBioFile) : null);
    const [sourceFr, sourceEn] = manualBio
      ? [manualBio.fr, manualBio.en]
      : apiFr && apiEn
        ? [apiFr.bio.trim(), apiEn.bio.trim()]
        : await Promise.all([readBio("fr", profile.bioSlug), readBio("en", profile.bioSlug)]);
    const [fr, en] = manualBio
      ? [sourceFr?.trim() ?? null, sourceEn?.trim() ?? null]
      : [publicBiography(sourceFr), publicBiography(sourceEn)];
    if (Boolean(fr) !== Boolean(en)) throw new Error(`Bio FR/EN incomplète pour ${profile.slug}`);

    let image = "/images/composers/composer_placeholder.svg";
    let imageSource: string | null = null;
    if (profile.localImageFile) {
      const source = path.join(root, "src/content/composer-sources", profile.localImageFile);
      const portraitFilename = composerPortraitFilename(profile.slug);
      const target = path.join(outputAssets, portraitFilename);
      await sharp(source)
        .rotate()
        .resize({ width: 720, height: 720, fit: "cover", position: "attention", withoutEnlargement: true })
        .webp({ quality: 82, effort: 6 })
        .toFile(target);
      image = `/images/composers/canonical/${portraitFilename}`;
      imageSource = profile.imageSlug;
    } else if (apiFr) {
      const imageUrl = new URL(apiFr.image, PORTFOLIO_API_ORIGIN).toString();
      let response = await fetch(imageUrl);
      if (!response.ok) {
        const optimizedImageUrl = `${PORTFOLIO_API_ORIGIN}/_next/image?url=${encodeURIComponent(apiFr.image)}&w=1080&q=90`;
        response = await fetch(optimizedImageUrl);
      }
      const imageBuffer = response.ok
        ? Buffer.from(await response.arrayBuffer())
        : await readPortfolioGitAsset(THIERRY_IMAGE_GIT_REF, THIERRY_IMAGE_PATH);
      const portraitFilename = composerPortraitFilename(profile.slug);
      const target = path.join(outputAssets, portraitFilename);
      await sharp(imageBuffer)
        .rotate()
        .resize({ width: 720, height: 720, fit: "cover", position: "attention", withoutEnlargement: true })
        .webp({ quality: 78, effort: 6 })
        .toFile(target);
      image = `/images/composers/canonical/${portraitFilename}`;
      imageSource = apiFr.image;
    } else if (profile.imageSlug) {
      const artist = artistsBySlug.get(profile.imageSlug);
      if (!artist) throw new Error(`Portrait Portfolio introuvable : ${profile.imageSlug}`);
      const source = path.join(portfolioRoot, profile.imageFile ?? artist.image);
      const portraitFilename = composerPortraitFilename(profile.slug);
      const target = path.join(outputAssets, portraitFilename);
      await sharp(source)
        .rotate()
        .resize({ width: 720, height: 720, fit: "cover", position: "attention", withoutEnlargement: true })
        .webp({ quality: 78, effort: 6 })
        .toFile(target);
      image = `/images/composers/canonical/${portraitFilename}`;
      imageSource = profile.imageSlug;
    }

    output.push({
      slug: profile.slug,
      name: profile.name,
      kind: profile.kind,
      bio: { fr, en },
      image,
      imageStatus: profile.localImageFile || profile.imageSlug || profile.apiSource ? "portrait" : "placeholder",
      harvest: {
        aliases: profile.aliases,
        scopedRelations: profile.scopedRelations ?? [],
        ...(profile.creditIdentities ? { creditIdentities: profile.creditIdentities } : {}),
      },
      legacySlugs: profile.legacySlugs ?? [],
      provenance: providedBio || profile.manualBioFile
        ? {
            source: "user-provided",
            capturedAt: providedBio ? providedBiographies.capturedAt : new Date().toISOString(),
            bioFile: providedBio ? USER_PROVIDED_BIOGRAPHIES_FILE : profile.manualBioFile!,
            ...(providedBio ? { sourceDocument: providedBio.sourceFile } : {}),
            imageSource: {
              repository: "portfolio-caro",
              commit: PORTFOLIO_COMMIT,
              imageSlug: imageSource,
            },
            ...(imageOverride(profile) ? { imageOverride: imageOverride(profile) } : {}),
          }
        : profile.apiSource
        ? {
            source: "portfolio-caro-api",
            urls: apiSnapshot!.urls,
            capturedAt: apiSnapshot!.capturedAt,
            artistSlug: profile.apiSource.slug,
            imageUrl: new URL(imageSource!, PORTFOLIO_API_ORIGIN).toString(),
            imageFallback: { repository: "portfolio-caro", ref: THIERRY_IMAGE_GIT_REF, path: THIERRY_IMAGE_PATH },
          }
        : {
            source: "portfolio-caro-git",
            repository: "portfolio-caro",
            commit: PORTFOLIO_COMMIT,
            bioSlug: profile.bioSlug,
            imageSlug: imageSource,
            editorialArtistSlug: profile.editorialArtistSlug ?? profile.bioSlug,
            ...(imageOverride(profile) ? { imageOverride: imageOverride(profile) } : {}),
          },
    });
  }

  await writeFile(
    path.join(root, "src/content/composer-profiles.generated.json"),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), profiles: output }, null, 2)}\n`,
  );
  const bios = output.filter((profile) => profile.bio.fr && profile.bio.en).length;
  const portraits = output.filter((profile) => profile.imageStatus === "portrait").length;
  process.stdout.write(`Registre compositeurs généré : ${output.length} profils, ${bios} bios FR/EN, ${portraits} portraits.\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
