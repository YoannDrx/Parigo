import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const CANONICAL_PROFILE_COUNT = 61;

type ProfileSource = {
  slug: string;
  name: string;
  kind: "person" | "group";
  localImageFile?: string;
  cardImageTransform?: {
    fit?: "cover" | "contain";
    position?: "attention" | "center" | "north" | "west";
    background?: string;
    inset?: number;
    extract?: { left: number; top: number; width: number; height: number };
  };
  aliases: string[];
  memberAliases?: string[];
  scopedRelations?: Array<{ albumCodes: string[]; aliases: string[] }>;
  creditIdentities?: Array<{ preferredName: string; aliases: string[]; albumCodes?: string[] }>;
  legacySlugs?: string[];
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
    name: "Aïwa",
    kind: "group",
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
    aliases: ["Arat Kilo"],
    memberAliases: [
      "Samuel Hirsch", "Florent Berteau", "Fabien Girard", "Gerald Bonnegrace", "Michael Havard",
      "Aristide Goncalves", "Arnold Turpin", "Camille Floriot", "Assitan Keita", "Mike Ladd",
      "Nardos Tesfaw", "ROCE", "Bruck Tesfaye",
    ],
  },
  { slug: "fabien-girard", name: "Fabien Girard", kind: "person", cardImageTransform: { inset: 0.035, background: "#1f2a27" }, aliases: ["Fabien Girard"] },
  { slug: "xavier-sibre", name: "Xavier Sibre", kind: "person", localImageFile: "xavier_sibre.jpg", aliases: ["Xavier Sibre"] },
  { slug: "ugly-mac-beer", name: "Ugly Mac Beer", kind: "person", localImageFile: "ugly_mac_beer.jpg", aliases: ["Ugly Mac Beer"] },
  { slug: "yann-kornowicz", name: "Yann Kornowicz", kind: "person", aliases: ["Yann Kornowicz"] },
  { slug: "dj-hertz", name: "DJ Hertz", kind: "person", aliases: ["Franck Sinnassamy", "DJ HERTZ", "DJ Hertz"], legacySlugs: ["franck-sinnassamy"] },
  { slug: "laurent-dury", name: "Laurent Dury", kind: "person", localImageFile: "laurent_dury.png", cardImageTransform: { extract: { left: 430, top: 250, width: 760, height: 760 }, position: "center" }, aliases: ["Laurent Dury"] },
  { slug: "liqid", name: "Liqid", kind: "person", aliases: ["Liqid"] },
  { slug: "tcheep", name: "Tcheep", kind: "person", localImageFile: "tcheep.jpg", aliases: ["Tcheep"] },
  { slug: "chicho-cortez", name: "Chicho Cortez", kind: "person", localImageFile: "chicho_cortez.jpeg", cardImageTransform: { fit: "contain", position: "center", background: "#000000" }, aliases: ["Chicho Cortez"] },
  { slug: "bonetrips", name: "Bonetrips", kind: "person", aliases: ["Bonetrips"] },
  { slug: "coeur", name: "Cœur", kind: "person", localImageFile: "coeur.jpg", aliases: ["Charlotte Duran"] },
  { slug: "arom", name: "Arom", kind: "person", localImageFile: "arom.jpg", aliases: ["Amaury Messelier", "AROM", "Arom"], legacySlugs: ["amaury-messelier"] },
  { slug: "minimatic", name: "Minimatic", kind: "person", localImageFile: "minimatic.jpg", aliases: ["Minimatic"] },
  {
    slug: "sebastien-blanchon-n-zeng",
    name: "Sébastien Blanchon",
    kind: "person",
    localImageFile: "sebastien_blanchon.jpg",
    aliases: ["Sébastien Blanchon", "Sebastien Blanchon", "N Zeng", "N’Zeng", "N'Zeng"],
    creditIdentities: [
      { preferredName: "Sébastien Blanchon", aliases: ["Sébastien Blanchon", "Sebastien Blanchon"] },
      { preferredName: "N Zeng", aliases: ["N Zeng", "N’Zeng", "N'Zeng"] },
    ],
    legacySlugs: ["sebastien-blanchon", "n-zeng"],
  },
  { slug: "drixxxe", name: "Drixxxé", kind: "person", localImageFile: "drixxxe.jpg", aliases: ["Drixxxé", "Drixxxe"] },
  { slug: "emmanuel-maree", name: "Emmanuel Marée", kind: "person", aliases: ["Emmanuel Marée"] },
  { slug: "f-stokes", name: "F.Stokes", kind: "person", cardImageTransform: { inset: 0.025, background: "#c8817c" }, aliases: ["Rodney Lucas"] },
  { slug: "forever-pavot", name: "Forever Pavot", kind: "person", localImageFile: "forever_pavot.jpg", aliases: ["Emile Sornin", "Sornin Emile"] },
  { slug: "frederic-hanak", name: "Frédéric Hanak", kind: "person", aliases: ["Frédéric Hanak", "Frederic Hanak"] },
  { slug: "madben", name: "Madben", kind: "person", cardImageTransform: { inset: 0.05, background: "#f0f0ee" }, aliases: ["Madben"] },
  { slug: "arandel", name: "Arandel", kind: "person", localImageFile: "arandel.jpg", aliases: ["Arandel"] },
  { slug: "the-architect", name: "The Architect", kind: "person", localImageFile: "the_architect.jpg", aliases: ["The Architect"] },
  {
    slug: "after-in-paris",
    name: "After In Paris",
    kind: "group",
    localImageFile: "after_in_paris.jpg",
    aliases: ["After In Paris"],
    memberAliases: ["Jean-Michel Vallet", "Claire Michael", "Patrick Chartol"],
  },
  { slug: "thierry-los", name: "Thierry Los", kind: "person", localImageFile: "thierry_los.jpg", cardImageTransform: { inset: 0.06, background: "#eee6ad" }, aliases: ["Thierry Loshouarn", "Thierry Los"] },
  { slug: "nicolas-pisani", name: "Nicolas Pisani", kind: "person", localImageFile: "nicolas_pisani.jpg", aliases: ["Nicolas Pisani"] },
  { slug: "blanka", name: "Blanka", kind: "person", localImageFile: "blanka.jpg", cardImageTransform: { position: "center" }, aliases: ["Blankalfe", "Blanka"] },
  { slug: "gerz", name: "Gerz", kind: "person", localImageFile: "gerz.jpg", cardImageTransform: { position: "attention" }, aliases: ["Gerz Marcellino", "Marcellino Gerz"] },
  { slug: "nsdos", name: "NSDOS", kind: "person", localImageFile: "nsdos.jpg", cardImageTransform: { position: "north" }, aliases: ["Brice Torres", "Torres Brice", "NSDOS"] },
  { slug: "nicodrum", name: "Nicodrum", kind: "person", aliases: ["Nicodrum", "Nicodrums", "Nicodrums & Friends", "Nicodrums Friends"], legacySlugs: ["nicodrums-friends"] },
  { slug: "2080", name: "2080", kind: "person", aliases: ["2080", "208"] },
  { slug: "jb-hanak", name: "JB Hanak", kind: "person", localImageFile: "jb_hanak.jpg", aliases: ["Jean-Baptiste Hanak", "Jean Baptiste Hanak", "JB HANAK"] },
  { slug: "aeon-seven", name: "Aeon Seven", kind: "person", localImageFile: "aeon_seven.png", aliases: ["Stéphane Delplanque", "Stephane Delplanque"] },
  { slug: "daniel-amozig", name: "Dan Amozig", kind: "person", localImageFile: "dan_amozig.jpg", cardImageTransform: { fit: "contain", position: "center", background: "#050505" }, aliases: ["Daniel Amozig", "Dan Amozig"], legacySlugs: ["dan-amozig"] },
  { slug: "yann-jankielewicz", name: "Yann Jankielewicz", kind: "person", cardImageTransform: { inset: 0.035, background: "#175a61" }, aliases: ["Yann Jankielewicz"] },
  { slug: "victor-baillet", name: "Victor Baillet", kind: "person", localImageFile: "victor_baillet.jpg", cardImageTransform: { inset: 0.035, background: "#eeeeec" }, aliases: ["Victor Baillet"] },
  { slug: "vincent-bouhelier", name: "Vincent Bouhelier", kind: "person", aliases: ["Vincent Bouhelier"] },
  {
    slug: "ana-kap",
    name: "Ana Kap",
    kind: "group",
    localImageFile: "ana_kap.jpg",
    cardImageTransform: { extract: { left: 0, top: 340, width: 980, height: 980 }, position: "center" },
    aliases: ["ANA KAP", "Ana Kap"],
    memberAliases: ["Emin Dzijan", "Manuel Decocq", "Pierre Millet", "Jean-Michel Trotoux"],
  },
  { slug: "alexis-molenat", name: "Alexis Molenat", kind: "person", aliases: ["Alexis Molenat", "Molenat Alexis"], legacySlugs: ["alexis-molenat-les-cavaliers"] },
  { slug: "maxime-raynier", name: "Maxime Raynier", kind: "person", aliases: ["Maxime Raynier", "Raynier Maxime"], legacySlugs: ["maxime-raynier-les-arondes"] },
  { slug: "patrice-dambrine", name: "Patrice Dambrine", kind: "person", localImageFile: "patrice_dambrine.jpg", cardImageTransform: { fit: "contain", position: "center", background: "#000000" }, aliases: ["Patrice Dambrine", "Dambrine Patrice"], legacySlugs: ["patrice-dambrine-viro-major-records"] },
  { slug: "bruno-hovart", name: "Bruno Hovart", kind: "person", localImageFile: "bruno_hovart.jpg", aliases: ["Bruno Hovart"] },
  { slug: "senior-ortegon", name: "Sr Ortegon", kind: "person", cardImageTransform: { inset: 0.04, background: "#030218" }, aliases: ["Senior Ortegon", "SR Ortegon", "Sr Ortegon"], legacySlugs: ["sr-ortegon"] },
  { slug: "stan-galouo", name: "Stan Galouo", kind: "person", localImageFile: "stan_galouo.png", cardImageTransform: { inset: 0.05, background: "#efefed" }, aliases: ["Stan Galouo"], legacySlugs: ["stan-galouo-palma-coco-reccords"] },
  { slug: "modulhater", name: "Modulhater", kind: "person", localImageFile: "modulhater.jpg", aliases: ["Modulhater"] },
  { slug: "ducer", name: "Ducer", kind: "person", aliases: ["Ducer"] },
  { slug: "dj-troubl", name: "DJ Troubl", kind: "person", localImageFile: "dj_troubl.jpg", aliases: ["DJ TRoubl", "DJ Troubl"] },
  { slug: "of-ivory-and-horn", name: "Of Ivory & Horn", kind: "group", localImageFile: "of_ivory_and_horn.jpg", aliases: ["Of Ivory And Horn", "Of Ivory & Horn"], legacySlugs: ["of-ivory-horn"] },
  { slug: "mister-modo", name: "Mister Modo", kind: "person", localImageFile: "mister_modo.jpg", aliases: ["Mister Modo"] },
  { slug: "grand-david", name: "Le Grand David", kind: "person", localImageFile: "grand_david.jpeg", cardImageTransform: { position: "attention" }, aliases: ["Grand David", "Le Grand David"] },
  { slug: "jean-pierre-menager", name: "Jean Pierre Ménager", kind: "person", cardImageTransform: { fit: "contain", background: "#080808" }, aliases: ["Jean Pierre Ménager", "Jean-Pierre Ménager", "Jean Pierre Menager"] },
  { slug: "loic-laporte", name: "Loïc Laporte", kind: "person", localImageFile: "loic_laporte.webp", cardImageTransform: { fit: "contain", position: "center", background: "#000000" }, aliases: ["Loic Laporte", "Loïc Laporte"] },
  { slug: "cyril-laurent", name: "Cyril Laurent", kind: "person", aliases: ["Cyril Laurent"] },
  { slug: "charlotte-savary", name: "Charlotte Savary", kind: "person", cardImageTransform: { inset: 0.035, background: "#b9b7b8" }, aliases: ["Charlotte Savary"] },
  { slug: "scherazade-aissahine", name: "Schérazade", kind: "person", aliases: ["Scherazade Aissahine", "Schérazade Aissahine"], legacySlugs: ["scherazade"] },
  { slug: "roma-luca", name: "Roma Luca", kind: "person", cardImageTransform: { inset: 0.045, background: "#3b2822" }, aliases: ["Camille Luca"] },
  {
    slug: "the-real-fake-mc",
    name: "The Real Fake MC",
    kind: "person",
    localImageFile: "the_real_fake_mc.jpg",
    cardImageTransform: { inset: 0.04, background: "#f1f1ef" },
    aliases: ["The Real Fake MC"],
  },
  {
    slug: "the-well-quartet",
    name: "Le Well Quartet",
    kind: "group",
    localImageFile: "the_well_quartet.jpeg",
    cardImageTransform: { position: "center" },
    aliases: ["The Well Quartet", "Well Quartet", "Le Well Quartet"],
  },
  {
    slug: "flore",
    name: "Flore",
    kind: "person",
    cardImageTransform: { inset: 0.035, background: "#dce6e9" },
    aliases: ["Flore", "Flore Morfin", "Flore Morchin"],
    creditIdentities: [{ preferredName: "Flore Morfin", aliases: ["Flore Morfin", "Flore Morchin", "Flore"] }],
  },
  {
    slug: "cedric-hanak",
    name: "Cédric Hanak",
    kind: "person",
    localImageFile: "cedric_hanak.jpg",
    cardImageTransform: { position: "center" },
    aliases: ["Cédric Hanak", "Cedric Hanak", "Cédric HANAK"],
  },
];

const root = process.cwd();

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

function composerPortraitFilename(slug: string): string {
  return `${slug.replaceAll("-", "_")}.webp`;
}

type PortraitInput = string | Buffer;

async function writePortraitAssets(
  input: PortraitInput,
  profile: ProfileSource,
  outputAssets: string,
  outputDetailAssets: string,
  quality: number,
) {
  const filename = composerPortraitFilename(profile.slug);
  const transform = profile.cardImageTransform;
  const inset = transform?.inset ?? 0;
  if (inset < 0 || inset >= 0.25) throw new Error(`Inset portrait invalide pour ${profile.slug}`);

  let card = sharp(input).rotate();
  if (transform?.extract) card = card.extract(transform.extract);
  const padding = Math.round(720 * inset);
  const innerSize = 720 - (padding * 2);
  card = card.resize({
    width: innerSize,
    height: innerSize,
    fit: transform?.fit ?? "cover",
    position: transform?.position ?? "attention",
    withoutEnlargement: !transform,
    ...(transform?.background ? { background: transform.background } : {}),
  });
  if (padding) {
    card = card.extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: transform?.background ?? "#111111",
    });
  }
  await card
    .webp({ quality, effort: 6 })
    .toFile(path.join(outputAssets, filename));

  const detailInfo = await sharp(input)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84, effort: 6 })
    .toFile(path.join(outputDetailAssets, filename));

  return {
    image: `/images/composers/canonical/${filename}`,
    detailImage: {
      src: `/images/composers/detail/${filename}`,
      width: detailInfo.width,
      height: detailInfo.height,
    },
  };
}

async function readStoredPortraitAssets(
  profile: ProfileSource,
  outputAssets: string,
  outputDetailAssets: string,
) {
  const filename = composerPortraitFilename(profile.slug);
  const cardSource = path.join(outputAssets, filename);
  const detailSource = path.join(outputDetailAssets, filename);
  await sharp(cardSource).metadata();
  const detailInfo = await sharp(detailSource).metadata();
  if (!detailInfo.width || !detailInfo.height) throw new Error(`Dimensions du portrait local introuvables : ${profile.slug}`);
  return {
    image: `/images/composers/canonical/${filename}`,
    detailImage: {
      src: `/images/composers/detail/${filename}`,
      width: detailInfo.width,
      height: detailInfo.height,
    },
  };
}

async function main() {
  if (profiles.length !== CANONICAL_PROFILE_COUNT) throw new Error(`Le registre doit contenir ${CANONICAL_PROFILE_COUNT} profils, reçu : ${profiles.length}`);
  const duplicateSlugs = profiles.filter((profile, index) => profiles.findIndex((item) => item.slug === profile.slug) !== index);
  if (duplicateSlugs.length) throw new Error(`Slugs dupliqués : ${duplicateSlugs.map((item) => item.slug).join(", ")}`);

  const providedBiographies = await readUserProvidedBiographies();
  const outputAssets = path.join(root, "public/images/composers/canonical");
  const outputDetailAssets = path.join(root, "public/images/composers/detail");
  await Promise.all([
    mkdir(outputAssets, { recursive: true }),
    mkdir(outputDetailAssets, { recursive: true }),
  ]);

  const output = [];
  for (const profile of profiles) {
    const providedBio = providedBiographies.profiles[profile.slug] ?? null;
    if (!providedBio) throw new Error(`Bio locale absente pour ${profile.slug}`);
    const fr = providedBio.fr.trim();
    const en = providedBio.en.trim();
    const portraitFile = profile.localImageFile
      ?? path.join("public/images/composers/detail", composerPortraitFilename(profile.slug));
    const { image, detailImage } = profile.localImageFile
      ? await writePortraitAssets(
          path.join(root, "src/content/composer-sources", portraitFile),
          profile,
          outputAssets,
          outputDetailAssets,
          82,
        )
      : await readStoredPortraitAssets(profile, outputAssets, outputDetailAssets);

    output.push({
      slug: profile.slug,
      name: profile.name,
      kind: profile.kind,
      bio: { fr, en },
      image,
      detailImage,
      imageStatus: "portrait",
      harvest: {
        aliases: profile.aliases,
        memberAliases: profile.memberAliases ?? [],
        scopedRelations: profile.scopedRelations ?? [],
        ...(profile.creditIdentities ? { creditIdentities: profile.creditIdentities } : {}),
      },
      legacySlugs: profile.legacySlugs ?? [],
      provenance: {
        source: "local-editorial",
        capturedAt: providedBiographies.capturedAt,
        biographyFile: USER_PROVIDED_BIOGRAPHIES_FILE,
        sourceDocument: providedBio.sourceFile,
        portraitFile,
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
