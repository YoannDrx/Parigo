import { readFile } from "node:fs/promises";
import path from "node:path";
import { normalizeHarvestCredit } from "../src/lib/editorial/contracts";
import { MatchingReviewDraftSchema, validateMatchingDraft } from "../src/lib/matching/contracts";

type EditorialArchiveSnapshot = {
  metrics: {
    artists: number;
    works: number;
    contributions: number;
    albumContributions: number;
    vinylContributions: number;
    clipContributions: number;
    clipProjectRelations: number;
  };
  artists: Array<{ slug: string }>;
  works: Array<{ slug: string; category: string }>;
  contributions: Array<{ id: string; workSlug: string; artistSlug: string }>;
  clipProjectRelations: Array<{ id: string; clipSlug: string; projectSlug: string; provenanceIds: string[] }>;
};

type Registry = {
  revision: string;
  identities: Array<{
    slug: string;
    name: string;
    aliases: string[];
    candidateAliases: string[];
  }>;
  decisions: Array<Record<string, unknown>>;
};

type EditorialSheetSnapshot = {
  tabs: Array<{ rows: Array<{ id: string; status: string }> }>;
};

async function json<T>(relative: string): Promise<T> {
  return JSON.parse(await readFile(path.join(process.cwd(), relative), "utf8")) as T;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const [archive, registry, sheet] = await Promise.all([
    json<EditorialArchiveSnapshot>("src/content/matching/editorial-archive.snapshot.json"),
    json<Registry>("src/content/matching/registry.json"),
    json<EditorialSheetSnapshot>("src/content/matching/google-sheet.snapshot.json"),
  ]);
  const artistSlugs = new Set(archive.artists.map((artist) => artist.slug));
  const workSlugs = new Set(archive.works.map((work) => work.slug));
  assert(archive.metrics.artists === archive.artists.length, "Le total d’artistes de l’archive éditoriale est incohérent.");
  assert(archive.metrics.works === archive.works.length, "Le total d’œuvres de l’archive éditoriale est incohérent.");
  assert(archive.metrics.contributions === archive.contributions.length, "Le total de contributions de l’archive éditoriale est incohérent.");
  assert(archive.metrics.clipProjectRelations === archive.clipProjectRelations.length, "Le total de liens clip/projet est incohérent.");
  assert(
    archive.metrics.albumContributions + archive.metrics.vinylContributions + archive.metrics.clipContributions
      === archive.metrics.contributions,
    "Certaines contributions de l’archive éditoriale sortent du périmètre album/vinyle/clip.",
  );
  for (const contribution of archive.contributions) {
    assert(artistSlugs.has(contribution.artistSlug), `Artiste inconnu dans ${contribution.id}.`);
    assert(workSlugs.has(contribution.workSlug), `Œuvre inconnue dans ${contribution.id}.`);
  }
  for (const relation of archive.clipProjectRelations) {
    assert(workSlugs.has(relation.clipSlug), `Clip inconnu dans ${relation.id}.`);
    assert(workSlugs.has(relation.projectSlug), `Projet inconnu dans ${relation.id}.`);
    assert(relation.provenanceIds.length > 0, `Provenance absente dans ${relation.id}.`);
  }
  const registrySlugs = new Set(registry.identities.map((identity) => identity.slug));
  assert(registrySlugs.size === registry.identities.length, "Le registre contient des slugs d’identité en double.");
  assert(
    registrySlugs.size === artistSlugs.size && [...artistSlugs].every((slug) => registrySlugs.has(slug)),
    "Le registre doit contenir exactement toutes les identités du snapshot archive éditoriale.",
  );
  const aliases = new Map<string, string>();
  for (const identity of registry.identities) {
    for (const value of [identity.name, ...identity.aliases]) {
      const normalized = normalizeHarvestCredit(value);
      const owner = aliases.get(normalized);
      assert(!owner || owner === identity.slug, `Collision d’alias entre ${owner} et ${identity.slug} : ${value}`);
      aliases.set(normalized, identity.slug);
    }
    const candidateAliases = new Set(identity.candidateAliases.map(normalizeHarvestCredit));
    assert(
      [...candidateAliases].every((candidate) => !identity.aliases.some((alias) => normalizeHarvestCredit(alias) === candidate)),
      `Un alias est à la fois candidat et validé pour ${identity.slug}.`,
    );
  }
  const sheetRows = sheet.tabs.flatMap((tab) => tab.rows);
  assert(new Set(sheetRows.map((row) => row.id)).size === sheetRows.length, "Le snapshot tableau éditorial contient des IDs en double.");
  assert(sheetRows.every((row) => row.status === "Validé" || row.status === "À vérifier"), "Statut tableau éditorial inconnu.");
  for (const decision of registry.decisions) {
    const parsed = MatchingReviewDraftSchema.parse({
      ...decision,
      baseRegistryRevision: registry.revision,
    });
    const errors = validateMatchingDraft(parsed);
    assert(errors.length === 0, `Décision invalide ${parsed.itemId} : ${errors.join(" ")}`);
  }
  console.log(
    `Matching valide : ${registry.identities.length} identités, ${archive.works.length} œuvres, `
      + `${archive.contributions.length} contributions, ${sheetRows.length} lignes tableau éditorial.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
