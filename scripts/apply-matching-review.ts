import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  MatchingReviewDraftSchema,
  validateMatchingDraft,
  type MatchingDraftExport,
  type MatchingReviewDraft,
} from "../src/lib/matching/contracts";

type Registry = {
  schemaVersion: 1;
  revision: string;
  updatedAt: string;
  sourceImports: Record<string, string>;
  identities: Array<{
    slug: string;
    name: string;
    kind: "person" | "group";
    visibility: "public" | "internal";
    published: boolean;
    aliases: string[];
    candidateAliases: string[];
    portfolioArtistSlug: string;
    note: string;
  }>;
  decisions: Array<Record<string, unknown> & { itemId: string }>;
};

type Editorial = {
  composers: Array<{
    slug: string;
    published: boolean;
    verifiedAlbums?: Array<{
      code: string;
      reviewState: "verified";
      source: "client-confirmed";
    }>;
    excludedAlbums?: Array<{
      code: string;
      reviewState: "verified";
      source: "client-confirmed";
    }>;
  } & Record<string, unknown>>;
  clips: Array<{
    slug: string;
    composerSlugs: string[];
  } & Record<string, unknown>>;
};

function nextRevision(revision: string): string {
  const match = revision.match(/^(.*-v)(\d+)$/);
  return match ? `${match[1]}${Number(match[2]) + 1}` : `${revision}-v2`;
}

function relationParts(itemId: string, identitySlugs: Set<string>) {
  if (!itemId.startsWith("relation:")) return undefined;
  const rest = itemId.slice("relation:".length);
  const composerSlug = [...identitySlugs]
    .sort((left, right) => right.length - left.length)
    .find((slug) => rest.startsWith(`${slug}:`));
  if (!composerSlug) return undefined;
  const target = rest.slice(composerSlug.length + 1);
  if (target.startsWith("album:")) return { composerSlug, type: "album" as const, target: target.slice(6) };
  if (target.startsWith("clip:")) return { composerSlug, type: "clip" as const, target: target.slice(5) };
  if (target.startsWith("vinyl:")) return { composerSlug, type: "vinyl" as const, target: target.slice(6) };
  return undefined;
}

function targetParts(workKey: string | undefined) {
  if (!workKey) return undefined;
  if (workKey.startsWith("album:")) return { type: "album" as const, target: workKey.slice(6) };
  if (workKey.startsWith("clip:")) return { type: "clip" as const, target: workKey.slice(5) };
  if (workKey.startsWith("vinyl:")) return { type: "vinyl" as const, target: workKey.slice(6) };
  return undefined;
}

function relationDefaults(draft: MatchingReviewDraft, identitySlugs: Set<string>) {
  const encoded = relationParts(draft.itemId, identitySlugs);
  const orphanComposer = draft.itemId.startsWith("orphan:composer:")
    ? draft.itemId.slice("orphan:composer:".length)
    : undefined;
  const orphanWorkKey = draft.itemId.startsWith("orphan:work:")
    ? draft.itemId.slice("orphan:work:".length)
    : draft.itemId.startsWith("orphan:clip:")
      ? draft.itemId.slice("orphan:clip:".length)
      : undefined;
  return {
    composerSlug: draft.selectedComposerSlug ?? encoded?.composerSlug ?? orphanComposer,
    workKey: draft.selectedWorkKey
      ?? (encoded ? `${encoded.type}:${encoded.target}` : undefined)
      ?? orphanWorkKey,
  };
}

function relationSet(
  composerSlugs: string[],
  workKeys: string[],
) {
  const relations = composerSlugs.flatMap((composerSlug) => workKeys.flatMap((workKey) => {
    const target = targetParts(workKey);
    return target ? [{ composerSlug, ...target }] : [];
  }));
  return [...new Map(relations.map((relation) => [
    `${relation.composerSlug}:${relation.type}:${relation.target}`,
    relation,
  ])).values()];
}

function resolvedRelationChanges(draft: MatchingReviewDraft, identitySlugs: Set<string>) {
  const defaults = relationDefaults(draft, identitySlugs);
  const composerSlugs = draft.selectedComposerSlugs
    ?? (defaults.composerSlug ? [defaults.composerSlug] : []);
  const workKeys = draft.selectedWorkKeys
    ?? (defaults.workKey ? [defaults.workKey] : []);
  const additions = relationSet(composerSlugs, workKeys);
  const removals = [
    ...relationSet(
      draft.removedComposerSlugs ?? [],
      workKeys.length ? workKeys : defaults.workKey ? [defaults.workKey] : [],
    ),
    ...relationSet(
      composerSlugs.length ? composerSlugs : defaults.composerSlug ? [defaults.composerSlug] : [],
      draft.removedWorkKeys ?? [],
    ),
  ];
  if (
    (draft.relationDecision === "remove" || draft.relationDecision === "none")
    && removals.length === 0
  ) {
    removals.push(...relationSet(
      defaults.composerSlug ? [defaults.composerSlug] : [],
      defaults.workKey ? [defaults.workKey] : [],
    ));
  }
  return {
    additions: draft.relationDecision === "remove" || draft.relationDecision === "none" ? [] : additions,
    removals: [...new Map(removals.map((relation) => [
      `${relation.composerSlug}:${relation.type}:${relation.target}`,
      relation,
    ])).values()],
  };
}

async function atomicJson(file: string, value: unknown) {
  const temporary = `${file}.matching-tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, file);
}

async function main() {
  const exportPath = process.argv[2];
  if (!exportPath) throw new Error("Usage : pnpm matching:apply <export.json>");
  const root = process.cwd();
  const registryPath = path.join(root, "src/content/matching/registry.json");
  const editorialPath = path.join(root, "src/content/editorial.generated.json");
  const [payloadRaw, registryRaw, editorialRaw] = await Promise.all([
    readFile(path.resolve(exportPath), "utf8"),
    readFile(registryPath, "utf8"),
    readFile(editorialPath, "utf8"),
  ]);
  const payload = JSON.parse(payloadRaw) as MatchingDraftExport;
  const registry = JSON.parse(registryRaw) as Registry;
  const editorial = JSON.parse(editorialRaw) as Editorial;
  if (payload.schemaVersion !== 1 || !Array.isArray(payload.drafts)) throw new Error("Format d’export inconnu.");
  if (payload.baseRegistryRevision !== registry.revision) {
    throw new Error(`Révision obsolète : export ${payload.baseRegistryRevision}, registre ${registry.revision}.`);
  }
  const identitySlugs = new Set(registry.identities.map((identity) => identity.slug));
  const parsedDrafts: MatchingReviewDraft[] = payload.drafts.map((draft) => MatchingReviewDraftSchema.parse(draft));
  for (const draft of parsedDrafts) {
    if (draft.baseRegistryRevision !== registry.revision) {
      throw new Error(`Révision obsolète dans ${draft.itemId}.`);
    }
    const errors = validateMatchingDraft(draft);
    if (errors.length) throw new Error(`${draft.itemId} : ${errors.join(" ")}`);
    if (draft.selectedComposerSlug && !identitySlugs.has(draft.selectedComposerSlug)) {
      throw new Error(`${draft.itemId} : compositeur attribué inconnu (${draft.selectedComposerSlug}).`);
    }
    const selectedComposerSlugs = [
      ...(draft.selectedComposerSlugs ?? []),
      ...(draft.removedComposerSlugs ?? []),
    ];
    const unknownComposer = selectedComposerSlugs.find((slug) => !identitySlugs.has(slug));
    if (unknownComposer) {
      throw new Error(`${draft.itemId} : compositeur attribué inconnu (${unknownComposer}).`);
    }
    const selectedWorkKeys = [
      ...(draft.selectedWorkKey ? [draft.selectedWorkKey] : []),
      ...(draft.selectedWorkKeys ?? []),
      ...(draft.removedWorkKeys ?? []),
    ];
    const invalidWork = selectedWorkKeys.find((workKey) => !targetParts(workKey));
    if (invalidWork) {
      throw new Error(`${draft.itemId} : album, vinyle ou clip attribué invalide (${invalidWork}).`);
    }
    const changes = resolvedRelationChanges(draft, identitySlugs);
    if ((draft.relationDecision === "add" || draft.relationDecision === "keep") && changes.additions.length === 0) {
      throw new Error(`${draft.itemId} : choisissez à la fois un compositeur et un album, vinyle ou clip.`);
    }
    if (draft.itemId.startsWith("orphan:composer:")) {
      const slug = draft.itemId.slice("orphan:composer:".length);
      if (!identitySlugs.has(slug)) throw new Error(`Identité inconnue : ${slug}`);
    } else if (draft.itemId.startsWith("relation:") && !relationParts(draft.itemId, identitySlugs)) {
      if (!draft.itemId.startsWith("relation:credit-") && !draft.itemId.startsWith("relation:clip:")) {
        throw new Error(`Relation inconnue ou non applicable : ${draft.itemId}`);
      }
    } else if (!/^(review:sheet:|orphan:(work|clip):|relation:)/.test(draft.itemId)) {
      throw new Error(`Identifiant de revue inconnu : ${draft.itemId}`);
    }
  }
  const nextRegistry: Registry = {
    ...registry,
    revision: nextRevision(registry.revision),
    updatedAt: new Date().toISOString(),
    decisions: [
      ...registry.decisions.filter((decision) => !parsedDrafts.some((draft) => draft.itemId === decision.itemId)),
      ...parsedDrafts.map(({ baseRegistryRevision, ...draft }) => {
        void baseRegistryRevision;
        return draft;
      }),
    ],
  };
  for (const draft of parsedDrafts) {
    if (draft.itemId.startsWith("orphan:composer:") && draft.publicationDecision) {
      const slug = draft.itemId.slice("orphan:composer:".length);
      const identity = nextRegistry.identities.find((item) => item.slug === slug);
      if (identity && draft.publicationDecision !== "unchanged") {
        identity.visibility = draft.publicationDecision === "public" ? "public" : "internal";
        identity.published = draft.publicationDecision === "public";
      }
    }
    const applyRelation = (
      relation: ReturnType<typeof resolvedRelationChanges>["additions"][number],
      shouldExist: boolean,
    ) => {
      if (relation.type === "album" && /^PGO\d{4}$/.test(relation.target)) {
      const profile = editorial.composers.find((item) => item.slug === relation.composerSlug);
      if (!profile) return;
      const existing = profile.verifiedAlbums ?? [];
      profile.verifiedAlbums = shouldExist
        ? [...new Map([...existing, {
          code: relation.target,
          reviewState: "verified" as const,
          source: "client-confirmed" as const,
        }].map((item) => [item.code, item])).values()]
        : existing.filter((item) => item.code !== relation.target);
      if (!profile.verifiedAlbums.length) delete profile.verifiedAlbums;
      const excluded = profile.excludedAlbums ?? [];
      profile.excludedAlbums = shouldExist
        ? excluded.filter((item) => item.code !== relation.target)
        : [...new Map([...excluded, {
          code: relation.target,
          reviewState: "verified" as const,
          source: "client-confirmed" as const,
        }].map((item) => [item.code, item])).values()];
      if (!profile.excludedAlbums.length) delete profile.excludedAlbums;
      }
      if (relation.type === "clip") {
      const clip = editorial.clips.find((item) => item.slug === relation.target);
      if (!clip) return;
      clip.composerSlugs = shouldExist
        ? [...new Set([...clip.composerSlugs, relation.composerSlug])]
        : clip.composerSlugs.filter((slug) => slug !== relation.composerSlug);
      }
    };
    const changes = resolvedRelationChanges(draft, identitySlugs);
    changes.additions.forEach((relation) => applyRelation(relation, true));
    changes.removals.forEach((relation) => applyRelation(relation, false));
  }
  for (const identity of nextRegistry.identities) {
    const profile = editorial.composers.find((item) => item.slug === identity.slug);
    if (profile) profile.published = identity.published;
  }
  await Promise.all([
    atomicJson(registryPath, nextRegistry),
    atomicJson(editorialPath, editorial),
  ]);
  console.log(`${parsedDrafts.length} décision(s) appliquée(s). Nouvelle révision : ${nextRegistry.revision}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
