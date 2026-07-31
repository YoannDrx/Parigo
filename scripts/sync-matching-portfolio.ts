import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

type PortfolioArtist = {
  id: number;
  slug: string;
  name: string;
  image?: string;
  externalUrl?: string | null;
  links?: Array<{
    platform: string;
    url: string;
    label?: string | null;
    order?: number;
  }>;
  order: number;
  isActive: boolean;
};

type PortfolioWork = {
  slug: string;
  titleFr: string;
  titleEn?: string;
  subtitleFr?: string;
  subtitleEn?: string;
  category: string;
  coverImage?: string;
  youtubeUrl?: string | null;
  externalUrl?: string | null;
  releaseDate?: string | null;
  genre?: string | null;
  relatedProjectSlugs?: string[];
  artists?: Array<{ slug: string; name?: string; role?: string }>;
  order: number;
  isActive: boolean;
};

type SimpleWork = {
  slug: string;
  title: string;
  subtitle?: string;
  category: string;
  categorySlug?: string;
  coverImage: string;
  coverImageAlt: string;
  relatedProjectSlugs?: string[];
};

type WorkRelations = {
  clipToProjects: Record<string, SimpleWork[]>;
};

const execFileAsync = promisify(execFile);
const projectRoot = process.cwd();
const portfolioRoot = process.env.PORTFOLIO_CARO_ROOT
  ? path.resolve(process.env.PORTFOLIO_CARO_ROOT)
  : path.resolve(projectRoot, "../portfolio-caro");
const outputPath = path.join(projectRoot, "src/content/matching/portfolio.snapshot.json");

function categorySlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function albumCode(work: PortfolioWork): string | undefined {
  return work.coverImage?.match(/\b(pgo\d{4})\b/i)?.[1]?.toUpperCase();
}

function youtubeId(value?: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value.trim());
    if (url.hostname === "youtu.be") return url.pathname.slice(1) || undefined;
    return url.searchParams.get("v") || url.pathname.match(/\/embed\/([^/?]+)/)?.[1];
  } catch {
    return undefined;
  }
}

function parseManualRelations(source: string): Map<string, string[]> {
  const body = source.match(/const manualClipToProjectMap[^=]*=\s*\{([\s\S]*?)\n\}/)?.[1];
  if (!body) throw new Error("La table manuelle clip/projet du Portfolio est introuvable.");
  const relations = new Map<string, string[]>();
  for (const line of body.split("\n")) {
    const match = line.match(/^\s*(?:'([^']+)'|"([^"]+)"|([a-zA-Z0-9_-]+))\s*:\s*\[([^\]]*)\]/);
    if (!match) continue;
    const clipSlug = match[1] || match[2] || match[3];
    const targets = [...match[4].matchAll(/['"]([^'"]+)['"]/g)].map((item) => item[1]);
    relations.set(clipSlug, targets);
  }
  return relations;
}

async function main() {
  const [artistsRaw, worksRaw, relationSource, gitResult] = await Promise.all([
    readFile(path.join(portfolioRoot, "seed-data/artists.json"), "utf8"),
    readFile(path.join(portfolioRoot, "seed-data/works.json"), "utf8"),
    readFile(path.join(portfolioRoot, "lib/workRelations.ts"), "utf8"),
    execFileAsync("git", ["-C", portfolioRoot, "rev-parse", "HEAD"]),
  ]);
  const artists = JSON.parse(artistsRaw) as PortfolioArtist[];
  const works = JSON.parse(worksRaw) as PortfolioWork[];
  const manualRelations = parseManualRelations(relationSource);
  const relationsModule = await import(pathToFileURL(path.join(portfolioRoot, "lib/workRelations.ts")).href) as {
    buildWorkRelations: (works: SimpleWork[]) => WorkRelations;
  };
  const simpleWorks: SimpleWork[] = works.map((work) => ({
    slug: work.slug,
    title: work.titleFr,
    subtitle: work.subtitleFr,
    category: work.category,
    categorySlug: categorySlug(work.category),
    coverImage: work.coverImage ?? "",
    coverImageAlt: work.titleFr,
    relatedProjectSlugs: work.relatedProjectSlugs,
  }));
  const upstreamRelations = relationsModule.buildWorkRelations(simpleWorks);
  const workBySlug = new Map(works.map((work) => [work.slug, work]));
  const clipProjectRelations = Object.entries(upstreamRelations.clipToProjects)
    .flatMap(([clipSlug, projects]) => projects.map((project) => {
      const clip = workBySlug.get(clipSlug);
      if (!clip) throw new Error(`Clip Portfolio inconnu : ${clipSlug}`);
      const provenanceIds = new Set<string>();
      const methods = new Set<string>();
      if (clip.relatedProjectSlugs?.includes(project.slug)) {
        provenanceIds.add("portfolio-related-project");
        methods.add("indirect-project");
      }
      if (manualRelations.get(clipSlug)?.includes(project.slug)) {
        provenanceIds.add("portfolio-manual-map");
        methods.add("manual-source-map");
      }
      const inferredSlug = clip.slug.replace(/-\d+$/, "").replace(/-clip$/, "");
      if (inferredSlug === project.slug) {
        provenanceIds.add("portfolio-slug-inference");
        methods.add("heuristic");
      }
      if (!provenanceIds.size) {
        throw new Error(`Provenance impossible à classifier : ${clipSlug} → ${project.slug}`);
      }
      return {
        id: `portfolio:clip-project:${clipSlug}:${project.slug}`,
        clipSlug,
        projectSlug: project.slug,
        projectType: categorySlug(workBySlug.get(project.slug)?.category ?? "unknown"),
        provenanceIds: [...provenanceIds].sort(),
        methods: [...methods].sort(),
      };
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  const normalizedWorks = works.map((work) => ({
    slug: work.slug,
    title: work.titleFr,
    titleEn: work.titleEn || work.titleFr,
    subtitle: work.subtitleFr || undefined,
    category: categorySlug(work.category),
    code: albumCode(work),
    coverImage: work.coverImage || undefined,
    youtubeId: youtubeId(work.youtubeUrl),
    externalUrl: work.externalUrl?.trim() || undefined,
    releaseDate: work.releaseDate || undefined,
    genre: work.genre || undefined,
    relatedProjectSlugs: work.relatedProjectSlugs ?? [],
    artistSlugs: work.artists?.map((artist) => artist.slug) ?? [],
    order: work.order,
    isActive: work.isActive,
  }));
  const contributions = works.flatMap((work) => (work.artists ?? []).map((artist, index) => ({
    id: `portfolio:contribution:${work.slug}:${artist.slug}`,
    workSlug: work.slug,
    artistSlug: artist.slug,
    role: artist.role || "artist",
    order: index,
    provenanceId: "portfolio-contribution",
  })));
  const categories = normalizedWorks.reduce<Record<string, number>>((result, work) => {
    result[work.category] = (result[work.category] ?? 0) + 1;
    return result;
  }, {});
  const albumContributions = contributions.filter((item) => workBySlug.get(item.workSlug)?.category === "album-de-librairie-musicale");
  const vinylContributions = contributions.filter((item) => workBySlug.get(item.workSlug)?.category === "vinyle");
  const clipContributions = contributions.filter((item) => workBySlug.get(item.workSlug)?.category === "clip");
  const contributedArtists = new Set(contributions.map((item) => item.artistSlug));
  const snapshot = {
    schemaVersion: 1,
    source: {
      repository: "portfolio-caro",
      commitSha: gitResult.stdout.trim(),
      capturedAt: new Date().toISOString(),
      files: [
        "seed-data/artists.json",
        "seed-data/works.json",
        "lib/workRelations.ts",
      ],
    },
    metrics: {
      artists: artists.length,
      works: works.length,
      categories,
      contributions: contributions.length,
      albumContributions: albumContributions.length,
      vinylContributions: vinylContributions.length,
      clipContributions: clipContributions.length,
      clipProjectRelations: clipProjectRelations.length,
      artistsWithoutContribution: artists.filter((artist) => !contributedArtists.has(artist.slug)).length,
    },
    artists: artists.map((artist) => ({
      slug: artist.slug,
      name: artist.name,
      image: artist.image,
      externalUrl: artist.externalUrl || undefined,
      links: (artist.links ?? []).map((link) => ({
        platform: link.platform,
        url: link.url,
        label: link.label || undefined,
        order: link.order ?? 0,
      })),
      order: artist.order,
      isActive: artist.isActive,
    })),
    works: normalizedWorks,
    contributions,
    clipProjectRelations,
  };
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(
    `Snapshot Portfolio : ${artists.length} artistes, ${works.length} œuvres, `
      + `${contributions.length} contributions, ${clipProjectRelations.length} relations clip/projet.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
