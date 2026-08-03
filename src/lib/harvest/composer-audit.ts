import type { Album, Track } from "@/types";
import {
  harvestComposerCreditId,
  normalizeHarvestComposerCredit,
} from "./composer-credits";

const SOCIETY_SUFFIX = /\s*\((SACEM|NS|BMI|ASCAP|PRS|SESAC)(?:[^)]*)\)\s*$/i;
const PARENTHETICAL = /\([^)]*\)/;
const WRITER_CAPACITY = /composer|author|arranger/i;

export type ComposerNamingIssue =
  | "society-suffix"
  | "parenthetical"
  | "duplicate-variant"
  | "spelling-candidate";

export type ComposerTrackRightsState = "aligned" | "missing-structured" | "different";

export type ComposerTrackAnomalyKind =
  | "missing-public-credit"
  | "different-right-holders"
  | "missing-structured-credit";

export interface ComposerAuditTrack {
  id: string;
  title: string;
  version?: string;
  isAlternate: boolean;
  albumId: string;
  albumCode?: string;
  albumTitle: string;
  composerNames: string[];
  structuredWriterNames: string[];
  rightsState: ComposerTrackRightsState;
}

export interface ComposerAuditAlbum {
  id: string;
  code?: string;
  title: string;
  tracks: ComposerAuditTrack[];
}

export interface ComposerAuditCredit {
  id: string;
  name: string;
  baseName: string;
  normalized: string;
  society?: string;
  issues: ComposerNamingIssue[];
  variants: string[];
  spellingCandidates: string[];
  trackCount: number;
  albumCount: number;
  alignedTrackCount: number;
  missingStructuredTrackCount: number;
  differentRightHolderTrackCount: number;
  albums: ComposerAuditAlbum[];
}

export interface ComposerTrackAnomaly {
  id: string;
  kind: ComposerTrackAnomalyKind;
  track: ComposerAuditTrack;
}

export interface ComposerAuditMetrics {
  albumCount: number;
  trackCount: number;
  creditCount: number;
  cleanCreditCount: number;
  creditsWithNamingIssues: number;
  societySuffixCount: number;
  parentheticalCount: number;
  duplicateGroupCount: number;
  spellingCandidatePairCount: number;
  missingPublicCreditCount: number;
  differentRightHoldersCount: number;
  missingStructuredCreditCount: number;
}

export interface ComposerAuditData {
  capturedAt: string;
  metrics: ComposerAuditMetrics;
  credits: ComposerAuditCredit[];
  trackAnomalies: ComposerTrackAnomaly[];
  failedAlbums: Array<{ id: string; code?: string; title: string }>;
  sourceAlbumCount: number;
}

type AuditAlbumInput = Pick<Album, "id" | "code" | "title"> & { tracks?: Track[] };

type FlatTrack = {
  album: Pick<Album, "id" | "code" | "title">;
  track: Track;
};

function uniqueStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

export function composerAuditBaseName(value: string): string {
  return value.replace(SOCIETY_SUFFIX, "").trim();
}

function structuredWriterNames(track: Track): string[] {
  return uniqueStrings((track.rightHolders ?? [])
    .filter((holder) => WRITER_CAPACITY.test(holder.capacity ?? ""))
    .map((holder) => holder.name));
}

function normalizedSet(values: string[]): Set<string> {
  return new Set(values.map(normalizeHarvestComposerCredit).filter(Boolean));
}

function rightsStateForCredit(credit: string, writers: string[]): ComposerTrackRightsState {
  if (!writers.length) return "missing-structured";
  return normalizedSet(writers).has(normalizeHarvestComposerCredit(credit)) ? "aligned" : "different";
}

function flattenTracks(albums: AuditAlbumInput[]): FlatTrack[] {
  const output: FlatTrack[] = [];
  const seen = new Set<string>();

  const append = (album: AuditAlbumInput, track: Track) => {
    const key = `${album.id}:${track.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    output.push({ album, track });
  };

  for (const album of albums) {
    for (const track of album.tracks ?? []) append(album, track);
  }
  return output;
}

export function levenshteinDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[right.length];
}

export function arePotentialComposerSpellings(left: string, right: string): boolean {
  const normalizedLeft = normalizeHarvestComposerCredit(left);
  const normalizedRight = normalizeHarvestComposerCredit(right);
  if (!normalizedLeft || !normalizedRight || normalizedLeft === normalizedRight) return false;

  const compactLeft = normalizedLeft.replaceAll(" ", "");
  const compactRight = normalizedRight.replaceAll(" ", "");
  const distance = levenshteinDistance(compactLeft, compactRight);

  if (/^\d+$/.test(compactLeft) && /^\d+$/.test(compactRight)) return distance === 1;

  const leftTokens = normalizedLeft.split(" ");
  const rightTokens = normalizedRight.split(" ");
  if (leftTokens.length > 1 && rightTokens.length > 1 && distance <= 2) {
    const sameFirstName = leftTokens[0] === rightTokens[0];
    const sameLastName = leftTokens.at(-1) === rightTokens.at(-1);
    return sameFirstName || sameLastName;
  }

  return leftTokens.length === 1
    && rightTokens.length === 1
    && Math.min(compactLeft.length, compactRight.length) >= 5
    && distance === 1;
}

function trackAuditView(entry: FlatTrack, credit?: string): ComposerAuditTrack {
  const composers = uniqueStrings(entry.track.composers ?? []);
  const writers = structuredWriterNames(entry.track);
  return {
    id: entry.track.id,
    title: entry.track.title,
    version: entry.track.version,
    isAlternate: Boolean(entry.track.isAlternate || entry.track.mainTrackId),
    albumId: entry.album.id,
    albumCode: entry.album.code,
    albumTitle: entry.album.title,
    composerNames: composers,
    structuredWriterNames: writers,
    rightsState: credit ? rightsStateForCredit(credit, writers) : "different",
  };
}

function anomalyFor(entry: FlatTrack): ComposerTrackAnomaly | undefined {
  const composers = uniqueStrings(entry.track.composers ?? []);
  const writers = structuredWriterNames(entry.track);
  const composerSet = normalizedSet(composers);
  const writerSet = normalizedSet(writers);
  let kind: ComposerTrackAnomalyKind | undefined;

  if (!composers.length && writers.length) kind = "missing-public-credit";
  else if (composers.length && !writers.length) kind = "missing-structured-credit";
  else if (
    composers.length
    && writers.length
    && ([...composerSet].some((name) => !writerSet.has(name)) || [...writerSet].some((name) => !composerSet.has(name)))
  ) kind = "different-right-holders";

  if (!kind) return undefined;
  return {
    id: `${kind}:${entry.album.id}:${entry.track.id}`,
    kind,
    track: trackAuditView(entry),
  };
}

export function buildComposerAudit(
  albums: AuditAlbumInput[],
  options: {
    capturedAt?: string;
    failedAlbums?: ComposerAuditData["failedAlbums"];
    sourceAlbumCount?: number;
  } = {},
): ComposerAuditData {
  const flatTracks = flattenTracks(albums);
  const tracksByCredit = new Map<string, FlatTrack[]>();

  for (const entry of flatTracks) {
    for (const credit of uniqueStrings(entry.track.composers ?? [])) {
      tracksByCredit.set(credit, [...(tracksByCredit.get(credit) ?? []), entry]);
    }
  }

  const variantsByNormalized = new Map<string, string[]>();
  for (const credit of tracksByCredit.keys()) {
    const normalized = normalizeHarvestComposerCredit(credit);
    variantsByNormalized.set(normalized, [...(variantsByNormalized.get(normalized) ?? []), credit]);
  }

  const spellingCandidates = new Map<string, Set<string>>();
  const normalizedGroups = [...variantsByNormalized.entries()];
  let spellingCandidatePairCount = 0;
  for (let leftIndex = 0; leftIndex < normalizedGroups.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < normalizedGroups.length; rightIndex += 1) {
      const [leftNormalized, leftVariants] = normalizedGroups[leftIndex];
      const [rightNormalized, rightVariants] = normalizedGroups[rightIndex];
      const leftName = composerAuditBaseName(leftVariants[0]);
      const rightName = composerAuditBaseName(rightVariants[0]);
      if (!arePotentialComposerSpellings(leftName, rightName)) continue;
      spellingCandidatePairCount += 1;
      spellingCandidates.set(leftNormalized, new Set([...(spellingCandidates.get(leftNormalized) ?? []), ...rightVariants]));
      spellingCandidates.set(rightNormalized, new Set([...(spellingCandidates.get(rightNormalized) ?? []), ...leftVariants]));
    }
  }

  const credits: ComposerAuditCredit[] = [...tracksByCredit.entries()].map(([name, entries]) => {
    const normalized = normalizeHarvestComposerCredit(name);
    const variants = [...new Set(variantsByNormalized.get(normalized) ?? [name])]
      .sort((left, right) => left.localeCompare(right, "fr", { sensitivity: "base" }));
    const candidateNames = [...(spellingCandidates.get(normalized) ?? [])]
      .sort((left, right) => left.localeCompare(right, "fr", { sensitivity: "base" }));
    const society = name.match(SOCIETY_SUFFIX)?.[1]?.toUpperCase();
    const issues: ComposerNamingIssue[] = [];
    if (society) issues.push("society-suffix");
    if (PARENTHETICAL.test(name) && !society) issues.push("parenthetical");
    if (variants.length > 1) issues.push("duplicate-variant");
    if (candidateNames.length) issues.push("spelling-candidate");

    const trackViews = entries.map((entry) => trackAuditView(entry, name));
    const albumMap = new Map<string, ComposerAuditAlbum>();
    for (const track of trackViews) {
      const album = albumMap.get(track.albumId) ?? {
        id: track.albumId,
        code: track.albumCode,
        title: track.albumTitle,
        tracks: [],
      };
      album.tracks.push(track);
      albumMap.set(track.albumId, album);
    }
    const auditAlbums = [...albumMap.values()]
      .map((album) => ({
        ...album,
        tracks: album.tracks.sort((left, right) => (
          left.title.localeCompare(right.title, "fr", { sensitivity: "base" })
          || left.id.localeCompare(right.id)
        )),
      }))
      .sort((left, right) => (
        (left.code ?? left.title).localeCompare(right.code ?? right.title, "fr", { numeric: true })
      ));

    return {
      id: harvestComposerCreditId(name),
      name,
      baseName: composerAuditBaseName(name),
      normalized,
      society,
      issues,
      variants,
      spellingCandidates: candidateNames,
      trackCount: trackViews.length,
      albumCount: auditAlbums.length,
      alignedTrackCount: trackViews.filter((track) => track.rightsState === "aligned").length,
      missingStructuredTrackCount: trackViews.filter((track) => track.rightsState === "missing-structured").length,
      differentRightHolderTrackCount: trackViews.filter((track) => track.rightsState === "different").length,
      albums: auditAlbums,
    };
  }).sort((left, right) => (
    Number(right.issues.length > 0) - Number(left.issues.length > 0)
    || right.issues.length - left.issues.length
    || left.name.localeCompare(right.name, "fr", { sensitivity: "base" })
  ));

  const allTrackAnomalies = flatTracks
    .map(anomalyFor)
    .filter(Boolean) as ComposerTrackAnomaly[];
  const trackAnomalies = allTrackAnomalies.filter((anomaly) => anomaly.kind !== "missing-structured-credit");
  trackAnomalies.sort((left, right) => (
    left.track.albumCode?.localeCompare(right.track.albumCode ?? "", "fr", { numeric: true })
    || left.track.title.localeCompare(right.track.title, "fr", { sensitivity: "base" })
  ));

  const duplicateGroupCount = [...variantsByNormalized.values()].filter((variants) => variants.length > 1).length;
  const creditsWithNamingIssues = credits.filter((credit) => credit.issues.length > 0).length;
  const failedAlbums = options.failedAlbums ?? [];

  return {
    capturedAt: options.capturedAt ?? new Date().toISOString(),
    sourceAlbumCount: options.sourceAlbumCount ?? albums.length + failedAlbums.length,
    failedAlbums,
    credits,
    trackAnomalies,
    metrics: {
      albumCount: albums.length,
      trackCount: flatTracks.length,
      creditCount: credits.length,
      cleanCreditCount: credits.length - creditsWithNamingIssues,
      creditsWithNamingIssues,
      societySuffixCount: credits.filter((credit) => credit.issues.includes("society-suffix")).length,
      parentheticalCount: credits.filter((credit) => credit.issues.includes("parenthetical")).length,
      duplicateGroupCount,
      spellingCandidatePairCount,
      missingPublicCreditCount: allTrackAnomalies.filter((item) => item.kind === "missing-public-credit").length,
      differentRightHoldersCount: allTrackAnomalies.filter((item) => item.kind === "different-right-holders").length,
      missingStructuredCreditCount: allTrackAnomalies.filter((item) => item.kind === "missing-structured-credit").length,
    },
  };
}
