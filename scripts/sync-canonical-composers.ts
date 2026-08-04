import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";

const PORTFOLIO_COMMIT = "6e88259a2634d82c7fc7cc723fbd3537da9371af";

type ProfileSource = {
  slug: string;
  name: string;
  kind: "person" | "group";
  bioSlug: string | null;
  imageSlug: string | null;
  imageFile?: string;
  aliases: string[];
  scopedRelations?: Array<{ albumCodes: string[]; aliases: string[] }>;
  creditIdentities?: Array<{ preferredName: string; aliases: string[]; albumCodes?: string[] }>;
  legacySlugs?: string[];
};

type PortfolioArtist = {
  slug: string;
  image: string;
};

const profiles: ProfileSource[] = [
  { slug: "fabien-girard", name: "Fabien Girard", kind: "person", bioSlug: "fabien-girard", imageSlug: "fabien-girard", aliases: ["Fabien Girard"] },
  { slug: "xavier-sibre", name: "Xavier Sibre", kind: "person", bioSlug: null, imageSlug: null, aliases: ["Xavier Sibre"] },
  { slug: "ugly-mac-beer", name: "Ugly Mac Beer", kind: "person", bioSlug: "ugly-mac-beer", imageSlug: "ugly-mac-beer", aliases: ["Ugly Mac Beer"] },
  { slug: "yann-kornowicz", name: "Yann Kornowicz", kind: "person", bioSlug: "yann-kornowicz", imageSlug: "yann-kornowicz", aliases: ["Yann Kornowicz"] },
  { slug: "dj-hertz", name: "DJ HERTZ", kind: "person", bioSlug: "dj-hertz", imageSlug: "dj-hertz", aliases: ["Franck Sinnassamy", "DJ HERTZ"], legacySlugs: ["franck-sinnassamy"] },
  { slug: "laurent-dury", name: "Laurent Dury", kind: "person", bioSlug: "laurent-dury", imageSlug: "laurent-dury", aliases: ["Laurent Dury"] },
  { slug: "liqid", name: "Liqid", kind: "person", bioSlug: "liqid", imageSlug: "liqid", aliases: ["Liqid"] },
  { slug: "bonetrips", name: "Bonetrips", kind: "person", bioSlug: "bonetrips", imageSlug: "bonetrips", aliases: ["Bonetrips"] },
  { slug: "arom", name: "AROM", kind: "person", bioSlug: "arom", imageSlug: "arom", aliases: ["Amaury Messelier", "AROM"], legacySlugs: ["amaury-messelier"] },
  { slug: "minimatic", name: "Minimatic", kind: "person", bioSlug: "minimatic", imageSlug: "minimatic", aliases: ["Minimatic"] },
  {
    slug: "sebastien-blanchon-n-zeng",
    name: "Sébastien Blanchon (N’Zeng)",
    kind: "person",
    bioSlug: "sebastien-blanchon",
    imageSlug: "sebastien-blanchon",
    aliases: ["Sébastien Blanchon", "Sebastien Blanchon", "N Zeng", "N’Zeng", "N'Zeng"],
    creditIdentities: [
      { preferredName: "Sébastien Blanchon", aliases: ["Sébastien Blanchon", "Sebastien Blanchon"] },
      { preferredName: "N Zeng", aliases: ["N Zeng", "N’Zeng", "N'Zeng"] },
    ],
    legacySlugs: ["sebastien-blanchon", "n-zeng"],
  },
  { slug: "drixxxe", name: "Drixxxé", kind: "person", bioSlug: "drixxxe", imageSlug: "drixxxe", aliases: ["Drixxxé", "Drixxxe"] },
  { slug: "madben", name: "Madben", kind: "person", bioSlug: "madben", imageSlug: "madben", aliases: ["Madben"] },
  { slug: "arandel", name: "Arandel", kind: "person", bioSlug: "arandel", imageSlug: "arandel", aliases: ["Arandel"] },
  { slug: "the-architect", name: "The Architect", kind: "person", bioSlug: "the-architect", imageSlug: "the-architect", aliases: ["The Architect"] },
  {
    slug: "after-in-paris",
    name: "After In Paris",
    kind: "group",
    bioSlug: "after-in-paris",
    imageSlug: "after-in-paris",
    aliases: [],
    scopedRelations: [{ albumCodes: ["PGO0031"], aliases: ["Jean-Michel Vallet", "Claire Michael", "Patrick Chartol", "After In Paris"] }],
  },
  { slug: "thierry-los", name: "Thierry Los", kind: "person", bioSlug: null, imageSlug: null, aliases: ["Thierry Loshouarn", "Thierry Los"] },
  { slug: "nicodrum", name: "Nicodrum", kind: "person", bioSlug: "nicodrums-friends", imageSlug: "nicodrums-friends", aliases: ["Nicodrum", "Nicodrums", "Nicodrums & Friends", "Nicodrums Friends"], legacySlugs: ["nicodrums-friends"] },
  { slug: "2080", name: "2080", kind: "person", bioSlug: "2080", imageSlug: "2080", aliases: ["2080", "208"] },
  { slug: "jb-hanak", name: "JB HANAK", kind: "person", bioSlug: "jb-hanak", imageSlug: "jb-hanak", aliases: ["Jean-Baptiste Hanak", "Jean Baptiste Hanak", "JB HANAK"] },
  { slug: "stephane-delplanque", name: "Stéphane Delplanque", kind: "person", bioSlug: null, imageSlug: null, aliases: ["Stéphane Delplanque", "Stephane Delplanque"] },
  { slug: "daniel-amozig", name: "Daniel Amozig", kind: "person", bioSlug: "dan-amozig", imageSlug: "dan-amozig", aliases: ["Daniel Amozig", "Dan Amozig"], legacySlugs: ["dan-amozig"] },
  { slug: "yann-jankielewicz", name: "Yann Jankielewicz", kind: "person", bioSlug: "yann-jankielewicz", imageSlug: "yann-jankielewicz", aliases: ["Yann Jankielewicz"] },
  { slug: "victor-baillet", name: "Victor Baillet", kind: "person", bioSlug: null, imageSlug: null, aliases: ["Victor Baillet"] },
  { slug: "vincent-bouhelier", name: "Vincent Bouhelier", kind: "person", bioSlug: null, imageSlug: null, aliases: ["Vincent Bouhelier"] },
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
  { slug: "patrice-dambrine", name: "Patrice Dambrine", kind: "person", bioSlug: "patrice-dambrine-viro-major-records", imageSlug: "patrice-dambrine-viro-major-records", aliases: ["Patrice Dambrine", "Dambrine Patrice"], legacySlugs: ["patrice-dambrine-viro-major-records"] },
  { slug: "bruno-hovart", name: "Bruno Hovart", kind: "person", bioSlug: "bruno-hovart", imageSlug: "bruno-hovart", aliases: ["Bruno Hovart"] },
  { slug: "senior-ortegon", name: "Senior Ortegon", kind: "person", bioSlug: "sr-ortegon", imageSlug: "sr-ortegon", aliases: ["Senior Ortegon", "SR Ortegon"], legacySlugs: ["sr-ortegon"] },
  { slug: "stan-galouo", name: "Stan Galouo", kind: "person", bioSlug: null, imageSlug: "stan-galouo-palma-coco-reccords", aliases: ["Stan Galouo"], legacySlugs: ["stan-galouo-palma-coco-reccords"] },
  { slug: "modulhater", name: "Modulhater", kind: "person", bioSlug: "modulhater", imageSlug: "modulhater", aliases: ["Modulhater"] },
  { slug: "ducer", name: "Ducer", kind: "person", bioSlug: "ducer", imageSlug: "ducer", aliases: ["Ducer"] },
  { slug: "dj-troubl", name: "DJ TRoubl", kind: "person", bioSlug: "dj-troubl", imageSlug: "dj-troubl", aliases: ["DJ TRoubl", "DJ Troubl"] },
  { slug: "of-ivory-and-horn", name: "Of Ivory And Horn", kind: "group", bioSlug: "of-ivory-horn", imageSlug: "of-ivory-horn", aliases: ["Of Ivory And Horn", "Of Ivory & Horn"], legacySlugs: ["of-ivory-horn"] },
  { slug: "mister-modo", name: "Mister Modo", kind: "person", bioSlug: "mister-modo", imageSlug: "mister-modo", aliases: ["Mister Modo"] },
  { slug: "grand-david", name: "Grand David", kind: "person", bioSlug: "grand-david", imageSlug: "grand-david", aliases: ["Grand David"] },
  { slug: "jean-pierre-menager", name: "Jean Pierre Ménager", kind: "person", bioSlug: "jean-pierre-menager", imageSlug: "jean-pierre-menager", aliases: ["Jean Pierre Ménager", "Jean-Pierre Ménager", "Jean Pierre Menager"] },
  { slug: "loic-laporte", name: "Loic Laporte", kind: "person", bioSlug: null, imageSlug: null, aliases: ["Loic Laporte", "Loïc Laporte"] },
  { slug: "cyril-laurent", name: "Cyril Laurent", kind: "person", bioSlug: "cyril-laurent", imageSlug: "cyril-laurent", aliases: ["Cyril Laurent"] },
  { slug: "charlotte-savary", name: "Charlotte Savary", kind: "person", bioSlug: "charlotte-savary", imageSlug: "charlotte-savary", aliases: ["Charlotte Savary"] },
  { slug: "scherazade-aissahine", name: "Scherazade Aissahine", kind: "person", bioSlug: null, imageSlug: "scherazade", aliases: ["Scherazade Aissahine", "Schérazade Aissahine"], legacySlugs: ["scherazade"] },
  {
    slug: "flore",
    name: "Flore",
    kind: "person",
    bioSlug: "flore",
    imageSlug: "flore",
    aliases: ["Flore", "Flore Morfin", "Flore Morchin"],
    creditIdentities: [{ preferredName: "Flore Morfin", aliases: ["Flore Morfin", "Flore Morchin", "Flore"] }],
  },
  { slug: "cedric-hanak", name: "Cédric HANAK", kind: "person", bioSlug: "cedric-hanak", imageSlug: "cedric-hanak", aliases: ["Cédric Hanak", "Cedric Hanak", "Cédric HANAK"] },
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

async function main() {
  const head = await portfolioHead();
  if (head !== PORTFOLIO_COMMIT) {
    throw new Error(`Portfolio Caro doit être positionné sur ${PORTFOLIO_COMMIT}, commit courant : ${head}`);
  }
  if (profiles.length !== 45) throw new Error(`Le registre doit contenir 45 profils, reçu : ${profiles.length}`);
  const duplicateSlugs = profiles.filter((profile, index) => profiles.findIndex((item) => item.slug === profile.slug) !== index);
  if (duplicateSlugs.length) throw new Error(`Slugs dupliqués : ${duplicateSlugs.map((item) => item.slug).join(", ")}`);

  const artists = JSON.parse(await readFile(path.join(portfolioRoot, "seed-data/artists.json"), "utf8")) as PortfolioArtist[];
  const artistsBySlug = new Map(artists.map((artist) => [artist.slug, artist]));
  const outputAssets = path.join(root, "public/images/composers/canonical");
  await mkdir(outputAssets, { recursive: true });

  const output = [];
  for (const profile of profiles) {
    const [fr, en] = await Promise.all([readBio("fr", profile.bioSlug), readBio("en", profile.bioSlug)]);
    if (Boolean(fr) !== Boolean(en)) throw new Error(`Bio FR/EN incomplète pour ${profile.slug}`);

    let image = "/images/composers/composer-placeholder.svg";
    let imageSource: string | null = null;
    if (profile.imageSlug) {
      const artist = artistsBySlug.get(profile.imageSlug);
      if (!artist) throw new Error(`Portrait Portfolio introuvable : ${profile.imageSlug}`);
      const source = path.join(portfolioRoot, profile.imageFile ?? artist.image);
      const target = path.join(outputAssets, `${profile.slug}.webp`);
      await sharp(source)
        .rotate()
        .resize({ width: 720, height: 720, fit: "cover", position: "attention", withoutEnlargement: true })
        .webp({ quality: 78, effort: 6 })
        .toFile(target);
      image = `/images/composers/canonical/${profile.slug}.webp`;
      imageSource = profile.imageSlug;
    }

    output.push({
      slug: profile.slug,
      name: profile.name,
      kind: profile.kind,
      bio: { fr, en },
      image,
      imageStatus: profile.imageSlug ? "portrait" : "placeholder",
      harvest: {
        aliases: profile.aliases,
        scopedRelations: profile.scopedRelations ?? [],
        ...(profile.creditIdentities ? { creditIdentities: profile.creditIdentities } : {}),
      },
      legacySlugs: profile.legacySlugs ?? [],
      provenance: {
        repository: "portfolio-caro",
        commit: PORTFOLIO_COMMIT,
        bioSlug: profile.bioSlug,
        imageSlug: imageSource,
      },
    });
  }

  await writeFile(
    path.join(root, "src/content/composer-profiles.generated.json"),
    `${JSON.stringify({ generatedAt: "2026-08-03", profiles: output }, null, 2)}\n`,
  );
  const bios = output.filter((profile) => profile.bio.fr && profile.bio.en).length;
  const portraits = output.filter((profile) => profile.imageStatus === "portrait").length;
  process.stdout.write(`Registre compositeurs généré : ${output.length} profils, ${bios} bios FR/EN, ${portraits} portraits.\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
