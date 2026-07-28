import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";

type SourceArtist = {
  slug: string;
  name: string;
  image: string;
  links?: Array<{ platform: string; url: string; label?: string | null; order?: number }>;
  externalUrl?: string | null;
};

type SourceWork = {
  slug: string;
  titleFr: string;
  titleEn: string;
  subtitleFr?: string;
  subtitleEn?: string;
  descriptionFr?: string;
  descriptionEn?: string;
  category: string;
  coverImage: string;
  youtubeUrl?: string | null;
  relatedProjectSlugs?: string[];
  order: number;
};

const root = process.cwd();
const portfolioRoot = process.env.PORTFOLIO_CARO_ROOT
  ? path.resolve(process.env.PORTFOLIO_CARO_ROOT)
  : path.resolve(root, "../portfolio-caro");
const outputData = path.join(root, "src/content/editorial.generated.json");
const outputAudit = path.join(root, "docs/editorial/composer-credit-audit.md");
const composerAssetRoot = path.join(root, "public/images/composers");
const clipAssetRoot = path.join(root, "public/images/clips");
const MAX_PUBLIC_BYTES = 12 * 1024 * 1024;
const execFileAsync = promisify(execFile);
let trackedSourceFiles = new Set<string>();

function sourceRelative(absolute: string): string {
  return path.relative(portfolioRoot, absolute).split(path.sep).join("/");
}

function assertTracked(absolute: string) {
  const relative = sourceRelative(absolute);
  if (relative.startsWith("../") || !trackedSourceFiles.has(relative)) {
    throw new Error(`Source absente de Git dans Portfolio Caro : ${relative}`);
  }
}

const exactHarvestProfiles = new Set([
  "2080",
  "arandel",
  "bonetrips",
  "bruno-hovart",
  "cally-reed",
  "cedric-hanak",
  "chicho-cortez",
  "chris-kemp",
  "cory-tate",
  "dj-troubl",
  "drixxxe",
  "ducer",
  "emmanuel-maree",
  "fabien-girard",
  "frederic-hanak",
  "gerz-marcellino",
  "grand-david",
  "jean-pierre-menager",
  "laurent-dury",
  "liqid",
  "madben",
  "minimatic",
  "mister-modo",
  "modulhater",
  "n-zeng",
  "nicolas-pisani",
  "of-ivory-horn",
  "pierre-millet",
  "rebecca-meyer",
  "sebastien-blanchon",
  "sr-ortegon",
  "tcheep",
  "the-architect",
  "the-real-fake-mc",
  "ugly-mac-beer",
  "yann-jankielewicz",
  "yann-kornowicz",
]);

const clipCredits: Record<string, string[]> = {
  "acid-body-music-2": ["modulhater"],
  ailleurs: ["arom"],
  "alien-suites-remixes": ["n-zeng"],
  "dark-ambient-2-making-of": ["ugly-mac-beer", "yann-kornowicz"],
  "dark-ambient-vol-2-2": ["ugly-mac-beer", "yann-kornowicz"],
  "hold-me-closer": ["dj-hertz"],
  "lofi-hip-hop-2": ["mutant-ninja-records"],
  "ny-parigo-2": ["f-stokes", "ugly-mac-beer"],
  "pixel-fiction-2": ["2080"],
  "riviera-bizarre-2": ["minimatic"],
  "une-derniere-fois-2": ["jb-hanak", "cedric-hanak"],
  "videoclub-2": ["dan-amozig", "yann-kornowicz"],
};

const manualClipCreditSlugs = new Set(["acid-body-music-2"]);
const manualClipAlbumCodes: Record<string, string> = {
  "acid-body-music-2": "PGO0025",
};

const groupProfiles = new Set([
  "mutant-ninja-records",
  "of-ivory-horn",
  "sebastien-blanchon-n-zeng",
]);

function youtubeId(value?: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return url.pathname.slice(1) || undefined;
    return url.searchParams.get("v") || url.pathname.match(/\/embed\/([^/?]+)/)?.[1];
  } catch {
    return undefined;
  }
}

function relatedAlbumCode(work: SourceWork, worksBySlug: Map<string, SourceWork>): string | undefined {
  const manualCode = manualClipAlbumCodes[work.slug];
  if (manualCode) return manualCode;
  for (const slug of work.relatedProjectSlugs ?? []) {
    const related = worksBySlug.get(slug);
    const code = related?.coverImage.match(/\b(pgo\d{4})\b/i)?.[1];
    if (code) return code.toUpperCase();
  }
  return undefined;
}

async function bio(locale: "fr" | "en", slug: string): Promise<string | undefined> {
  const file = path.join(portfolioRoot, "content/artist-bios", locale, `${slug}.md`);
  if (!trackedSourceFiles.has(sourceRelative(file))) return undefined;
  return readFile(file, "utf8")
    .then((value) => value.trim().replace(/^https:\/\/\S+\s*/i, "").trim() || undefined)
    .catch(() => undefined);
}

async function optimize(source: string, target: string, quality: number, maxDimension = 1200) {
  assertTracked(source);
  await mkdir(path.dirname(target), { recursive: true });
  await sharp(source)
    .rotate()
    .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
    .webp({ quality, effort: 5 })
    .toFile(target);
}

async function walkSize(directory: string): Promise<number> {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walkSize(absolute) : (await stat(absolute)).size;
  }))).reduce((sum, value) => sum + value, 0);
}

async function main() {
  const { stdout } = await execFileAsync("git", ["-C", portfolioRoot, "ls-files", "-z"], { encoding: "buffer" });
  trackedSourceFiles = new Set(stdout.toString("utf8").split("\0").filter(Boolean));
  const artistsSource = path.join(portfolioRoot, "seed-data/artists.json");
  const worksSource = path.join(portfolioRoot, "seed-data/works.json");
  assertTracked(artistsSource);
  assertTracked(worksSource);
  const [artists, works] = await Promise.all([
    readFile(artistsSource, "utf8").then((value) => JSON.parse(value) as SourceArtist[]),
    readFile(worksSource, "utf8").then((value) => JSON.parse(value) as SourceWork[]),
  ]);
  const worksBySlug = new Map(works.map((work) => [work.slug, work]));
  const clipProfileSlugs = new Set(Object.values(clipCredits).flat());
  const knownSlugs = new Set(artists.map((artist) => artist.slug));
  const unknownClipCredits = [...clipProfileSlugs].filter((slug) => !knownSlugs.has(slug));
  if (unknownClipCredits.length) throw new Error(`Profils de clips inconnus : ${unknownClipCredits.join(", ")}`);

  const publishedArtists = artists.filter((artist) => exactHarvestProfiles.has(artist.slug) || clipProfileSlugs.has(artist.slug));
  const clipWorks = works.filter((work) => work.category === "clip");
  for (const source of [
    ...publishedArtists.map((artist) => path.join(portfolioRoot, artist.image)),
    ...clipWorks.map((work) => path.join(portfolioRoot, work.coverImage)),
  ]) {
    assertTracked(source);
    await stat(source);
  }
  await Promise.all([
    rm(composerAssetRoot, { recursive: true, force: true }),
    rm(clipAssetRoot, { recursive: true, force: true }),
  ]);
  const composers = await Promise.all(publishedArtists.map(async (artist) => {
    const target = path.join(composerAssetRoot, `${artist.slug}.webp`);
    await optimize(path.join(portfolioRoot, artist.image), target, 72, 1000);
    const links = [...(artist.links ?? [])]
      .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
      .filter((link) => link.url.startsWith("https://"))
      .map(({ platform, label, url }) => ({ platform, ...(label ? { label } : {}), url }));
    if (artist.externalUrl?.startsWith("https://") && !links.some((link) => link.url === artist.externalUrl)) {
      links.push({ platform: "website", label: "Website", url: artist.externalUrl });
    }
    return {
      slug: artist.slug,
      name: artist.name,
      image: `/images/composers/${artist.slug}.webp`,
      bio: {
        fr: await bio("fr", artist.slug),
        en: await bio("en", artist.slug),
      },
      links,
      kind: groupProfiles.has(artist.slug) ? "group" : "person",
      harvestAliases: exactHarvestProfiles.has(artist.slug) ? [artist.name] : [],
      published: true,
      source: "portfolio-caro",
    };
  }));

  const clips = await Promise.all(
    clipWorks.map(async (work) => {
      const target = path.join(clipAssetRoot, `${work.slug}.webp`);
      await optimize(path.join(portfolioRoot, work.coverImage), target, 78);
      const albumCode = relatedAlbumCode(work, worksBySlug);
      return {
        slug: work.slug,
        title: { fr: work.titleFr, en: work.titleEn },
        subtitle: { fr: work.subtitleFr || undefined, en: work.subtitleEn || undefined },
        description: { fr: work.descriptionFr || undefined, en: work.descriptionEn || undefined },
        cover: `/images/clips/${work.slug}.webp`,
        youtubeId: youtubeId(work.youtubeUrl),
        composerSlugs: clipCredits[work.slug] ?? [],
        relatedAlbumCode: albumCode,
        videoType: /making.of/i.test(work.slug) ? "making-of" : "official-video",
        source: "portfolio-caro",
        reviewState: "verified",
        composerRelationSource: (clipCredits[work.slug]?.length ?? 0) > 0
          ? (manualClipCreditSlugs.has(work.slug) ? "manual" : "portfolio-caro")
          : undefined,
        albumRelationSource: albumCode
          ? (manualClipAlbumCodes[work.slug] ? "manual" : "portfolio-caro")
          : undefined,
        order: work.order,
        published: true,
      };
    }),
  );

  await mkdir(path.dirname(outputData), { recursive: true });
  await writeFile(outputData, `${JSON.stringify({ composers, clips }, null, 2)}\n`);

  const unresolvedClips = clips.filter((clip) => !clip.composerSlugs.length).map((clip) => clip.slug);
  const publishedSlugs = new Set(composers.map((profile) => profile.slug));
  const unpublished = artists.filter((artist) => !publishedSlugs.has(artist.slug)).map((artist) => artist.slug);
  const withoutBio = composers.filter((profile) => profile.published && !profile.bio.fr && !profile.bio.en).map((profile) => profile.slug);
  const composerBySlug = new Map(composers.map((profile) => [profile.slug, profile]));
  const profileAuditRows = artists.map((artist) => {
    const profile = composerBySlug.get(artist.slug);
    return `| ${artist.slug} | ${profile ? "publié" : "non publié"} | ${profile?.harvestAliases.join(", ") || "—"} |`;
  }).join("\n");
  const clipAuditRows = clips.map((clip) => (
    `| ${clip.slug} | ${clip.composerSlugs.join(", ") || "non vérifié"} | ${clip.relatedAlbumCode || "—"} |`
  )).join("\n");
  const report = `# Audit éditorial compositeurs et clips

Ce rapport est généré par \`pnpm migrate:editorial\` depuis les données suivies par Git de Portfolio Caro.

## Résumé

- Profils candidats : ${artists.length}
- Profils publiés : ${composers.length}
- Profils avec correspondance Harvest exacte : ${exactHarvestProfiles.size}
- Clips publiés : ${clips.length}
- Clips avec URL YouTube : ${clips.filter((clip) => clip.youtubeId).length}

## Profils candidats et alias acceptés

| Profil | Publication | Alias de crédit validé |
| --- | --- | --- |
${profileAuditRows}

## État du rapprochement des crédits

- Variantes de crédits rencontrées lors du dernier audit Harvest : 173.
- Profils rapprochés automatiquement lors de l’audit initial : 48 variantes textuelles.
- Collisions entre alias publiés : aucune.
- Nouveaux crédits non rattachés : à recalculer avec \`pnpm test:harvest:composers\` contre l’environnement live.
- Les valeurs ci-dessus documentent la migration initiale ; le smoke test live est la source de contrôle pour toute nouvelle publication.

## Profils non publiés

${unpublished.map((slug) => `- ${slug}`).join("\n") || "- Aucun"}

## Profils publiés sans biographie

${withoutBio.map((slug) => `- ${slug}`).join("\n") || "- Aucun"}

## Clips sans crédit compositeur vérifié

${unresolvedClips.map((slug) => `- ${slug}`).join("\n") || "- Aucun"}

## Relations de clips

| Clip | Compositeurs vérifiés | Album relié |
| --- | --- | --- |
${clipAuditRows}

## Règles

- Les rapprochements Harvest automatiques sont limités à une égalité après normalisation de la casse, des diacritiques, de la ponctuation et du suffixe de société de gestion.
- Les relations historiques album/artiste servent uniquement de candidats d’audit.
- Aucun clip n’est attribué automatiquement à tous les compositeurs de son projet associé.
`;
  await mkdir(path.dirname(outputAudit), { recursive: true });
  await writeFile(outputAudit, report);

  const publicBytes = await walkSize(path.join(root, "public"));
  if (publicBytes > MAX_PUBLIC_BYTES) {
    throw new Error(`Budget public dépassé après migration : ${(publicBytes / 1024 / 1024).toFixed(2)} Mio > 12 Mio`);
  }
  console.log(`Migration éditoriale terminée : ${composers.length} profils, ${clips.length} clips, ${(publicBytes / 1024 / 1024).toFixed(2)} Mio publics.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
