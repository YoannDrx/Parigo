import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveCanonicalComposerCredit } from "../src/lib/composers/profiles";
import { normalizeHarvestComposerCredit } from "../src/lib/harvest/composer-credits";
import { recommendComposerCreditName } from "../src/lib/harvest/composer-naming";

const PARIGO_LABEL_ID = "b9d701733704e2d7";
const baseUrl = (process.env.PARIGO_HARVEST_EXPORT_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const outputRoot = path.join(process.cwd(), "docs/harvest/composer-cleanup");

type RightHolder = {
  id: string;
  name: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  capacity?: string;
  capacityGroup?: string;
  collectingSociety?: string;
  ipi?: string;
  share?: number;
  shareType?: string;
};

type Track = {
  id: string;
  title: string;
  version?: string;
  mainTrackId?: string;
  isAlternate?: boolean;
  composers?: string[];
  artists?: Array<{ name: string }>;
  publishers?: string[];
  rightHolders?: RightHolder[];
};

type Album = {
  id: string;
  code?: string;
  title: string;
  label: string;
  labelSlug?: string;
  tracks?: Track[];
};

type FlatTrack = Track & { albumId: string; albumCode: string; albumTitle: string };

const writerCapacity = /composer|author|arranger/i;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

async function mapConcurrent<T, R>(values: T[], limit: number, task: (value: T) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(values.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      output[index] = await task(values[index]);
    }
  }));
  return output;
}

function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

function writers(track: Track): string[] {
  return unique((track.rightHolders ?? [])
    .filter((holder) => writerCapacity.test(holder.capacity ?? ""))
    .map((holder) => holder.name));
}

function csvCell(value: unknown): string {
  const string = Array.isArray(value) ? value.join(" · ") : String(value ?? "");
  return `"${string.replaceAll('"', '""').replace(/[\r\n]+/g, " ")}"`;
}

function csv(rows: unknown[][]): string {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\n")}\n`;
}

function proposedName(name: string, track: FlatTrack): { value: string; reason?: string } {
  const resolved = resolveCanonicalComposerCredit(name, track.albumCode);
  const trackWriters = writers(track);
  const composerSet = new Set(unique(track.composers ?? []).map(normalizeHarvestComposerCredit));
  const writerSet = new Set(trackWriters.map(normalizeHarvestComposerCredit));
  const hasContradictoryEvidence = writerSet.size > 0 && (
    composerSet.size !== writerSet.size || [...composerSet].some((value) => !writerSet.has(value))
  );
  const result = recommendComposerCreditName(name, {
    preferredName: resolved?.identity.preferredName,
    structuredWriterNames: trackWriters,
    hasContradictoryEvidence,
  });
  if (!result.proposedName) return { value: name };
  return {
    value: result.proposedName,
    reason: result.evidence === "canonical-registry"
      ? "identité-canonique-courante"
      : result.evidence === "structured-right-holder"
        ? "identité-structurée-courante"
        : "normalisation-mécanique",
  };
}

function decision(track: FlatTrack) {
  const before = unique(track.composers ?? []);
  const trackWriters = writers(track);
  if (!before.length) {
    const resolvedWriters = trackWriters.map((writer) => resolveCanonicalComposerCredit(writer, track.albumCode));
    if (trackWriters.length && resolvedWriters.every(Boolean)) {
      return {
        before,
        after: unique(resolvedWriters.map((resolved) => resolved?.identity.preferredName)),
        action: "update",
        reason: "composer-vide-identités-canoniques-attestées-par-ayants-droit",
      } as const;
    }
    return {
      before,
      after: before,
      action: trackWriters.length ? "needs-review" : "no-change",
      reason: trackWriters.length ? "composer-vide-ayant-droit-présent-hors-règle-validée" : "aucun-compositeur",
    } as const;
  }

  const proposals = before.map((name) => proposedName(name, track));
  const after = unique(proposals.map((proposal) => proposal.value));
  const reasons = unique(proposals.map((proposal) => proposal.reason));
  const changed = JSON.stringify(before) !== JSON.stringify(after);
  const composerSet = new Set(after.map(normalizeHarvestComposerCredit));
  const writerSet = new Set(trackWriters.map(normalizeHarvestComposerCredit));
  const contradictory = trackWriters.length > 0
    && ([...composerSet].some((name) => !writerSet.has(name)) || [...writerSet].some((name) => !composerSet.has(name)));
  return {
    before,
    after,
    action: changed ? "update" : contradictory ? "needs-review" : "no-change",
    reason: reasons.join("+") || (contradictory ? "écart-ayant-droit-à-valider" : "déjà-canonique"),
  } as const;
}

async function main() {
  const index = await getJson<{ data: { albums: Album[] }; meta: { total: number } }>(
    `${baseUrl}/api/albums?label=${PARIGO_LABEL_ID}&limit=100&sort=recent`,
  );
  if (index.data.albums.length !== index.meta.total) {
    throw new Error(`Export album incomplet : ${index.data.albums.length}/${index.meta.total}`);
  }
  const albums = await mapConcurrent(index.data.albums, 6, async (album) => (
    getJson<{ data: { album: Album } }>(`${baseUrl}/api/albums/${album.id}`).then((payload) => payload.data.album)
  ));
  if (albums.some((album) => album.labelSlug !== PARIGO_LABEL_ID)) throw new Error("L’export contient un album hors label Parigo.");

  const tracks: FlatTrack[] = albums.flatMap((album) => (album.tracks ?? []).map((track) => ({
    ...track,
    albumId: album.id,
    albumCode: album.code ?? "",
    albumTitle: album.title,
  })));
  const decisions = tracks.map((track) => ({ ...track, ...decision(track) }));

  const variantGroups = new Map<string, Set<string>>();
  for (const track of tracks) {
    for (const name of unique(track.composers ?? [])) {
      const normalized = normalizeHarvestComposerCredit(name);
      const values = variantGroups.get(normalized) ?? new Set<string>();
      values.add(name);
      variantGroups.set(normalized, values);
    }
  }
  const simplePilotGroup = [...variantGroups.entries()]
    .filter(([, values]) => [...values].some((name) => /\(NS\)/i.test(name)) && [...values].some((name) => /\(SACEM\)/i.test(name)))
    .sort(([left], [right]) => left.localeCompare(right, "fr"))[0]?.[0];

  const pilotRows = decisions.filter((row) => {
    const normalizedBefore = row.before.map(normalizeHarvestComposerCredit);
    return /pigalle bizarre/i.test(row.albumTitle) && normalizedBefore.includes("minimatic")
      || /riviera bizarre/i.test(row.albumTitle) && row.reason.includes("minimatic")
      || normalizedBefore.includes(normalizeHarvestComposerCredit("Flore Morchin"))
      || normalizedBefore.includes("208")
      || Boolean(simplePilotGroup && normalizedBefore.includes(simplePilotGroup));
  });

  const exactValues = new Map<string, {
    proposed: Set<string>;
    actions: Set<string>;
    reasons: Set<string>;
    trackIds: Set<string>;
    albums: Set<string>;
    versions: Set<string>;
  }>();
  for (const row of decisions) {
    for (const currentValue of row.before.length ? row.before : [""]) {
      const item = exactValues.get(currentValue) ?? {
        proposed: new Set(), actions: new Set(), reasons: new Set(), trackIds: new Set(), albums: new Set(), versions: new Set(),
      };
      const proposal = currentValue
        ? proposedName(currentValue, row).value
        : row.after.join(" · ");
      if (proposal) item.proposed.add(proposal);
      item.actions.add(row.action);
      item.reasons.add(row.reason);
      item.trackIds.add(row.id);
      item.albums.add(`${row.albumCode} · ${row.albumTitle}`);
      if (row.version) item.versions.add(row.version);
      exactValues.set(currentValue, item);
    }
  }

  const capturedAt = new Date().toISOString();
  const rollbackAlbums = albums.map((album) => ({
    id: album.id,
    code: album.code,
    title: album.title,
    label: album.label,
    labelSlug: album.labelSlug,
    tracks: (album.tracks ?? []).map((track) => ({
      id: track.id,
      mainTrackId: track.mainTrackId,
      title: track.title,
      version: track.version,
      isAlternate: track.isAlternate,
      composers: track.composers ?? [],
      artists: track.artists ?? [],
      publishers: track.publishers ?? [],
      rightHolders: track.rightHolders ?? [],
    })),
  }));
  const backup = {
    schemaVersion: 1,
    capturedAt,
    source: `${baseUrl}/api/albums`,
    labelId: PARIGO_LABEL_ID,
    albumCount: albums.length,
    trackCount: tracks.length,
    albums: rollbackAlbums,
  };
  const backupJson = `${JSON.stringify(backup, null, 2)}\n`;
  const checksum = createHash("sha256").update(backupJson).digest("hex");
  await mkdir(outputRoot, { recursive: true });
  await Promise.all([
    writeFile(path.join(outputRoot, "2026-08-03-before.json"), backupJson),
    writeFile(path.join(outputRoot, "2026-08-03-before.sha256"), `${checksum}  2026-08-03-before.json\n`),
    writeFile(path.join(outputRoot, "track-decisions.csv"), csv([
      ["album_code", "album_id", "album", "track_id", "main_track_id", "titre", "version", "alternate", "composer_avant", "composer_proposé", "action", "justification", "artist", "publisher", "ayants_droit_structurés", "validation"],
      ...decisions.map((row) => [row.albumCode, row.albumId, row.albumTitle, row.id, row.mainTrackId, row.title, row.version, Boolean(row.isAlternate || row.mainTrackId), row.before, row.after, row.action, row.reason, row.artists?.map((artist) => artist.name), row.publishers, row.rightHolders?.map((holder) => `${holder.name}|${holder.capacity ?? ""}|${holder.collectingSociety ?? ""}|${holder.ipi ?? ""}|${holder.share ?? ""}`), row.action === "update" ? "pilot-pending" : row.action]),
    ])),
    writeFile(path.join(outputRoot, "composer-values.csv"), csv([
      ["valeur_actuelle", "valeur_canonique_proposée", "actions", "pistes", "albums", "versions", "justifications", "validation"],
      ...[...exactValues.entries()].sort(([left], [right]) => left.localeCompare(right, "fr", { sensitivity: "base" })).map(([name, item]) => [name || "[VIDE]", [...item.proposed], [...item.actions], [...item.trackIds], [...item.albums], [...item.versions], [...item.reasons], [...item.actions].includes("needs-review") ? "needs-review" : "pilot-pending"]),
    ])),
    writeFile(path.join(outputRoot, "pilot.csv"), csv([
      ["album_code", "album_id", "album", "track_id", "main_track_id", "titre", "version", "composer_avant", "composer_proposé", "action", "justification", "validation"],
      ...pilotRows.map((row) => [row.albumCode, row.albumId, row.albumTitle, row.id, row.mainTrackId, row.title, row.version, row.before, row.after, row.action, row.reason, "à-valider-avant-première-sauvegarde"]),
    ])),
  ]);

  const updateCount = decisions.filter((row) => row.action === "update").length;
  const reviewCount = decisions.filter((row) => row.action === "needs-review").length;
  const pilotCategoryCounts = {
    minimaticPigalle: pilotRows.filter((row) => /pigalle bizarre/i.test(row.albumTitle) && row.before.map(normalizeHarvestComposerCredit).includes("minimatic")).length,
    minimaticRivieraMissing: pilotRows.filter((row) => /riviera bizarre/i.test(row.albumTitle) && row.reason.includes("minimatic")).length,
    floreMorchin: pilotRows.filter((row) => row.before.map(normalizeHarvestComposerCredit).includes(normalizeHarvestComposerCredit("Flore Morchin"))).length,
    legacy208: pilotRows.filter((row) => row.before.map(normalizeHarvestComposerCredit).includes("208")).length,
    simpleVariantGroup: simplePilotGroup
      ? pilotRows.filter((row) => row.before.map(normalizeHarvestComposerCredit).includes(simplePilotGroup)).length
      : 0,
  };
  await writeFile(path.join(outputRoot, "manifest.json"), `${JSON.stringify({
    capturedAt,
    labelId: PARIGO_LABEL_ID,
    albumCount: albums.length,
    trackCount: tracks.length,
    exactComposerValueCount: exactValues.size,
    backupSha256: checksum,
    decisions: { update: updateCount, needsReview: reviewCount, noChange: decisions.length - updateCount - reviewCount },
    pilot: { trackCount: pilotRows.length, simpleVariantGroup: simplePilotGroup, categories: pilotCategoryCounts },
    rightHolderRegistry: {
      exported: false,
      reason: "À exporter séparément dans Harvest avant toute fusion ou suppression de fiche.",
    },
  }, null, 2)}\n`);
  process.stdout.write([
    `Export avant nettoyage : ${albums.length} albums, ${tracks.length} pistes/versions`,
    `SHA-256 : ${checksum}`,
    `Décisions proposées : ${updateCount} mises à jour, ${reviewCount} needs-review`,
    `Lot pilote : ${pilotRows.length} pistes/versions${simplePilotGroup ? `, groupe variantes « ${simplePilotGroup} »` : ""}`,
  ].join("\n") + "\n");
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
