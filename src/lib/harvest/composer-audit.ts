import type { Album, Track } from "@/types";
import {
  canonicalComposerProfiles,
  resolveCanonicalComposerCredit,
  type CanonicalComposerProfile,
  type CanonicalHarvestCreditIdentity,
} from "@/lib/composers/profiles";
import {
  harvestComposerCreditId,
  normalizeHarvestComposerCredit,
} from "./composer-credits";
import {
  COMPOSER_SOCIETY_SUFFIX,
  composerCreditBaseName,
  hasInvalidComposerCharacter,
  type ComposerNamingEvidence,
} from "./composer-naming";

const WRITER_CAPACITY = /composer|author|arranger/i;

export type HarvestAuditStatus = "clean" | "cleanup-required" | "review-required" | "no-credit";
export type EditorialAuditStatus = "complete" | "incomplete" | "not-applicable";
export type ComposerTrackRightsState = "aligned" | "missing-structured" | "different";
export type ComposerAuditIdentitySource = "public-profile" | "harvest-only" | "public-profile-only" | "unassigned";
export type ComposerAuditRecommendationKind =
  | "society-suffix"
  | "preferred-name"
  | "duplicate-variant"
  | "spelling-candidate"
  | "missing-public-credit"
  | "different-right-holders"
  | "invalid-character";

export interface ComposerAuditRecommendation {
  id: string;
  kind: ComposerAuditRecommendationKind;
  severity: "cleanup" | "review";
  currentNames: string[];
  proposedName?: string;
  evidence?: ComposerNamingEvidence;
  trackCount: number;
  trackIds: string[];
}

export interface ComposerAuditTrack {
  id: string;
  title: string;
  version?: string;
  trackNumber?: number;
  isAlternate: boolean;
  albumId: string;
  albumCode?: string;
  albumTitle: string;
  matchedCreditNames: string[];
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

export interface ComposerAuditAlbumSummary {
  id: string;
  code?: string;
  title: string;
  trackCount: number;
}

export interface ComposerAuditPublicProfile {
  slug: string;
  name: string;
  hasBioFr: boolean;
  hasBioEn: boolean;
  hasPortrait: boolean;
}

export interface ComposerAuditIdentity {
  id: string;
  preferredName: string;
  source: ComposerAuditIdentitySource;
  publicProfile?: ComposerAuditPublicProfile;
  exactCredits: Array<{ name: string; trackCount: number }>;
  albumCount: number;
  trackCount: number;
  alignedTrackCount: number;
  missingStructuredTrackCount: number;
  differentRightHolderTrackCount: number;
  albums: ComposerAuditAlbum[];
  harvestStatus: HarvestAuditStatus;
  editorialStatus: EditorialAuditStatus;
  recommendations: ComposerAuditRecommendation[];
}

export interface ComposerAuditMetrics {
  albumCount: number;
  trackCount: number;
  exactCreditCount: number;
  identityCount: number;
  actionRequiredCount: number;
  cleanupRequiredCount: number;
  reviewRequiredCount: number;
  cleanCount: number;
  noCreditCount: number;
  publicIdentityCount: number;
  harvestOnlyCount: number;
  incompleteEditorialCount: number;
  missingBioFrCount: number;
  missingBioEnCount: number;
  missingPortraitCount: number;
  missingPublicCreditCount: number;
  differentRightHoldersCount: number;
  missingStructuredCreditCount: number;
}

export interface ComposerAuditData {
  capturedAt: string;
  metrics: ComposerAuditMetrics;
  identities: ComposerAuditIdentity[];
  failedAlbums: Array<{ id: string; code?: string; title: string }>;
  sourceAlbumCount: number;
}

export type ComposerAuditRecommendationSummary = Omit<ComposerAuditRecommendation, "trackIds">;

export interface ComposerAuditIdentitySummary extends Omit<ComposerAuditIdentity, "albums" | "recommendations"> {
  albums: ComposerAuditAlbumSummary[];
  recommendations: ComposerAuditRecommendationSummary[];
  searchText: string;
}

export interface ComposerAuditSummaryData extends Omit<ComposerAuditData, "identities"> {
  identities: ComposerAuditIdentitySummary[];
}

type AuditAlbumInput = Pick<Album, "id" | "code" | "title"> & { tracks?: Track[] };
type FlatTrack = { album: Pick<Album, "id" | "code" | "title">; track: Track };
type IdentityOccurrence = { entry: FlatTrack; credit?: string; missingPublic: boolean };
type IdentitySeed = {
  id: string;
  preferredName?: string;
  profile?: CanonicalComposerProfile;
  canonicalIdentity?: CanonicalHarvestCreditIdentity;
  source: ComposerAuditIdentitySource;
  occurrences: IdentityOccurrence[];
};

function uniqueStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

export function composerAuditBaseName(value: string): string {
  return composerCreditBaseName(value);
}

function structuredWriterNames(track: Track): string[] {
  return uniqueStrings((track.rightHolders ?? [])
    .filter((holder) => WRITER_CAPACITY.test(holder.capacity ?? ""))
    .map((holder) => holder.name));
}

function normalizedSet(values: string[]): Set<string> {
  return new Set(values.map(normalizeHarvestComposerCredit).filter(Boolean));
}

function rightsState(track: Track): ComposerTrackRightsState {
  const composers = uniqueStrings(track.composers ?? []);
  const writers = structuredWriterNames(track);
  if (!writers.length) return "missing-structured";
  const composerSet = normalizedSet(composers);
  const writerSet = normalizedSet(writers);
  return composerSet.size === writerSet.size && [...composerSet].every((name) => writerSet.has(name))
    ? "aligned"
    : "different";
}

function flattenTracks(albums: AuditAlbumInput[]): FlatTrack[] {
  const output: FlatTrack[] = [];
  const seen = new Set<string>();
  const append = (album: AuditAlbumInput, track: Track) => {
    const key = `${album.id}:${track.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    output.push({ album, track });
    for (const alternate of track.alternateTracks ?? []) append(album, alternate);
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
    return leftTokens[0] === rightTokens[0] || leftTokens.at(-1) === rightTokens.at(-1);
  }
  return leftTokens.length === 1
    && rightTokens.length === 1
    && Math.min(compactLeft.length, compactRight.length) >= 5
    && distance === 1;
}

function publicProfile(profile: CanonicalComposerProfile): ComposerAuditPublicProfile {
  return {
    slug: profile.slug,
    name: profile.name,
    hasBioFr: Boolean(profile.bio.fr),
    hasBioEn: Boolean(profile.bio.en),
    hasPortrait: profile.imageStatus === "portrait",
  };
}

function editorialStatus(profile?: CanonicalComposerProfile): EditorialAuditStatus {
  if (!profile) return "not-applicable";
  return profile.bio.fr && profile.bio.en && profile.imageStatus === "portrait" ? "complete" : "incomplete";
}

function canonicalIdentityId(profile: CanonicalComposerProfile, identity: CanonicalHarvestCreditIdentity): string {
  return `canonical-${profile.slug}-${harvestComposerCreditId(identity.preferredName).replace(/^harvest-/, "")}`;
}

function seedForCredit(name: string, albumCode?: string): Omit<IdentitySeed, "occurrences"> {
  const resolved = resolveCanonicalComposerCredit(name, albumCode);
  if (resolved) {
    return {
      id: canonicalIdentityId(resolved.profile, resolved.identity),
      preferredName: resolved.identity.preferredName,
      profile: resolved.profile,
      canonicalIdentity: resolved.identity,
      source: "public-profile",
    };
  }
  const baseName = composerCreditBaseName(name) || name.trim();
  return {
    id: harvestComposerCreditId(normalizeHarvestComposerCredit(baseName)),
    preferredName: undefined,
    source: "harvest-only",
  };
}

function trackView(entry: FlatTrack, matchedCreditNames: string[]): ComposerAuditTrack {
  return {
    id: entry.track.id,
    title: entry.track.title,
    version: entry.track.version,
    trackNumber: entry.track.trackNumber,
    isAlternate: Boolean(entry.track.isAlternate || entry.track.mainTrackId),
    albumId: entry.album.id,
    albumCode: entry.album.code,
    albumTitle: entry.album.title,
    matchedCreditNames,
    composerNames: uniqueStrings(entry.track.composers ?? []),
    structuredWriterNames: structuredWriterNames(entry.track),
    rightsState: rightsState(entry.track),
  };
}

function recommendation(
  identityId: string,
  kind: ComposerAuditRecommendationKind,
  severity: "cleanup" | "review",
  options: Omit<ComposerAuditRecommendation, "id" | "kind" | "severity" | "trackCount">,
): ComposerAuditRecommendation {
  return {
    id: `${identityId}:${kind}:${options.proposedName ?? options.currentNames.join("|")}`,
    kind,
    severity,
    ...options,
    trackCount: options.trackIds.length,
  };
}

function statusFrom(identity: Pick<ComposerAuditIdentity, "trackCount" | "recommendations">): HarvestAuditStatus {
  if (!identity.trackCount) return "no-credit";
  if (identity.recommendations.some((item) => item.severity === "review")) return "review-required";
  if (identity.recommendations.some((item) => item.severity === "cleanup")) return "cleanup-required";
  return "clean";
}

function buildIdentity(seed: IdentitySeed): ComposerAuditIdentity {
  const exactCreditTracks = new Map<string, Set<string>>();
  const trackOccurrences = new Map<string, IdentityOccurrence[]>();
  for (const occurrence of seed.occurrences) {
    const trackKey = `${occurrence.entry.album.id}:${occurrence.entry.track.id}`;
    trackOccurrences.set(trackKey, [...(trackOccurrences.get(trackKey) ?? []), occurrence]);
    if (occurrence.credit) {
      const ids = exactCreditTracks.get(occurrence.credit) ?? new Set<string>();
      ids.add(trackKey);
      exactCreditTracks.set(occurrence.credit, ids);
    }
  }

  const rawNames = [...exactCreditTracks.keys()].sort((left, right) => left.localeCompare(right, "fr", { sensitivity: "base" }));
  const hasContradictoryRights = seed.occurrences.some(({ entry }) => rightsState(entry.track) === "different");
  const writerCandidates = uniqueStrings(seed.occurrences.flatMap(({ entry, credit }) => {
    if (!credit) return structuredWriterNames(entry.track);
    const normalized = normalizeHarvestComposerCredit(credit);
    return structuredWriterNames(entry.track).filter((writer) => normalizeHarvestComposerCredit(writer) === normalized);
  }));
  const baseCandidates = uniqueStrings(rawNames.map(composerCreditBaseName));
  const preferredName = seed.preferredName
    ?? (writerCandidates.length === 1 ? writerCandidates[0] : undefined)
    ?? (baseCandidates.length === 1 ? baseCandidates[0] : undefined)
    ?? baseCandidates[0]
    ?? "Compositeur non renseigné";
  const evidence: ComposerNamingEvidence | undefined = seed.canonicalIdentity
    ? "canonical-registry"
    : writerCandidates.length === 1 ? "structured-right-holder"
      : baseCandidates.length === 1 ? "mechanical" : undefined;
  const safeEvidence = hasContradictoryRights ? undefined : evidence;

  const tracks = [...trackOccurrences.values()].map((occurrences) => (
    trackView(occurrences[0].entry, uniqueStrings(occurrences.map((item) => item.credit)))
  ));
  const albumsById = new Map<string, ComposerAuditAlbum>();
  for (const track of tracks) {
    const album = albumsById.get(track.albumId) ?? {
      id: track.albumId,
      code: track.albumCode,
      title: track.albumTitle,
      tracks: [],
    };
    album.tracks.push(track);
    albumsById.set(track.albumId, album);
  }
  const albums = [...albumsById.values()].map((album) => ({
    ...album,
    tracks: album.tracks.sort((left, right) => (
      (left.trackNumber ?? Number.MAX_SAFE_INTEGER) - (right.trackNumber ?? Number.MAX_SAFE_INTEGER)
      || left.title.localeCompare(right.title, "fr", { sensitivity: "base" })
    )),
  })).sort((left, right) => (left.code ?? left.title).localeCompare(right.code ?? right.title, "fr", { numeric: true }));

  const recommendations: ComposerAuditRecommendation[] = [];
  const allTrackIds = [...new Set(tracks.map((track) => track.id))];
  const missingTrackIds = [...new Set(seed.occurrences.filter((item) => item.missingPublic).map((item) => item.entry.track.id))];
  if (missingTrackIds.length) {
    recommendations.push(recommendation(seed.id, "missing-public-credit", preferredName === "Compositeur non renseigné" ? "review" : "cleanup", {
      currentNames: [],
      proposedName: preferredName === "Compositeur non renseigné" ? undefined : preferredName,
      evidence: preferredName === "Compositeur non renseigné" ? undefined : safeEvidence ?? "structured-right-holder",
      trackIds: missingTrackIds,
    }));
  }

  const invalidNames = rawNames.filter(hasInvalidComposerCharacter);
  if (invalidNames.length) {
    recommendations.push(recommendation(seed.id, "invalid-character", "review", {
      currentNames: invalidNames,
      proposedName: safeEvidence ? preferredName : undefined,
      evidence: safeEvidence,
      trackIds: [...new Set(invalidNames.flatMap((name) => [...(exactCreditTracks.get(name) ?? [])].map((key) => key.split(":").at(-1)!)))],
    }));
  }

  const suffixNames = rawNames.filter((name) => COMPOSER_SOCIETY_SUFFIX.test(name) && name !== preferredName);
  if (suffixNames.length && safeEvidence) {
    recommendations.push(recommendation(seed.id, "society-suffix", "cleanup", {
      currentNames: suffixNames,
      proposedName: preferredName,
      evidence: safeEvidence,
      trackIds: [...new Set(suffixNames.flatMap((name) => [...(exactCreditTracks.get(name) ?? [])].map((key) => key.split(":").at(-1)!)))],
    }));
  }

  const otherMismatches = rawNames.filter((name) => name !== preferredName && !suffixNames.includes(name) && !invalidNames.includes(name));
  if (otherMismatches.length && safeEvidence) {
    recommendations.push(recommendation(seed.id, "preferred-name", "cleanup", {
      currentNames: otherMismatches,
      proposedName: preferredName,
      evidence: safeEvidence,
      trackIds: [...new Set(otherMismatches.flatMap((name) => [...(exactCreditTracks.get(name) ?? [])].map((key) => key.split(":").at(-1)!)))],
    }));
  }

  if (rawNames.length > 1) {
    recommendations.push(recommendation(seed.id, "duplicate-variant", safeEvidence ? "cleanup" : "review", {
      currentNames: rawNames,
      proposedName: safeEvidence ? preferredName : undefined,
      evidence: safeEvidence,
      trackIds: allTrackIds,
    }));
  }

  const differentTrackIds = tracks.filter((track) => track.rightsState === "different").map((track) => track.id);
  if (differentTrackIds.length) {
    recommendations.push(recommendation(seed.id, "different-right-holders", "review", {
      currentNames: rawNames,
      trackIds: differentTrackIds,
    }));
  }

  const identity: ComposerAuditIdentity = {
    id: seed.id,
    preferredName,
    source: seed.source,
    publicProfile: seed.profile ? publicProfile(seed.profile) : undefined,
    exactCredits: rawNames.map((name) => ({ name, trackCount: exactCreditTracks.get(name)?.size ?? 0 })),
    albumCount: albums.length,
    trackCount: tracks.length,
    alignedTrackCount: tracks.filter((track) => track.rightsState === "aligned").length,
    missingStructuredTrackCount: tracks.filter((track) => track.rightsState === "missing-structured").length,
    differentRightHolderTrackCount: tracks.filter((track) => track.rightsState === "different").length,
    albums,
    harvestStatus: "clean",
    editorialStatus: editorialStatus(seed.profile),
    recommendations,
  };
  identity.harvestStatus = statusFrom(identity);
  return identity;
}

function profileOnlyIdentity(profile: CanonicalComposerProfile): ComposerAuditIdentity {
  const identity: ComposerAuditIdentity = {
    id: `profile-only-${profile.slug}`,
    preferredName: profile.name,
    source: "public-profile-only",
    publicProfile: publicProfile(profile),
    exactCredits: [],
    albumCount: 0,
    trackCount: 0,
    alignedTrackCount: 0,
    missingStructuredTrackCount: 0,
    differentRightHolderTrackCount: 0,
    albums: [],
    harvestStatus: "no-credit",
    editorialStatus: editorialStatus(profile),
    recommendations: [],
  };
  return identity;
}

function addSpellingRecommendations(identities: ComposerAuditIdentity[]): void {
  for (let leftIndex = 0; leftIndex < identities.length; leftIndex += 1) {
    const left = identities[leftIndex];
    if (!left.trackCount) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < identities.length; rightIndex += 1) {
      const right = identities[rightIndex];
      if (!right.trackCount || left.publicProfile?.slug === right.publicProfile?.slug) continue;
      if (!arePotentialComposerSpellings(left.preferredName, right.preferredName)) continue;
      left.recommendations.push(recommendation(left.id, "spelling-candidate", "review", {
        currentNames: [left.preferredName, right.preferredName],
        trackIds: left.albums.flatMap((album) => album.tracks.map((track) => track.id)),
      }));
      right.recommendations.push(recommendation(right.id, "spelling-candidate", "review", {
        currentNames: [right.preferredName, left.preferredName],
        trackIds: right.albums.flatMap((album) => album.tracks.map((track) => track.id)),
      }));
    }
  }
  for (const identity of identities) identity.harvestStatus = statusFrom(identity);
}

function priority(status: HarvestAuditStatus, editorial: EditorialAuditStatus): number {
  if (status === "review-required") return 0;
  if (status === "cleanup-required") return 1;
  if (status === "no-credit") return 2;
  if (editorial === "incomplete") return 3;
  return 4;
}

export function summarizeComposerAudit(data: ComposerAuditData): ComposerAuditSummaryData {
  return {
    ...data,
    identities: data.identities.map((identity) => {
      const searchValues = uniqueStrings([
        identity.preferredName,
        identity.publicProfile?.name,
        identity.publicProfile?.slug,
        ...identity.exactCredits.map((credit) => credit.name),
        ...identity.recommendations.flatMap((item) => [item.proposedName, ...item.currentNames]),
        ...identity.albums.flatMap((album) => [
          album.id,
          album.code,
          album.title,
          ...album.tracks.flatMap((track) => [
            track.id,
            track.title,
            track.version,
          ]),
        ]),
      ]);
      return {
        ...identity,
        albums: identity.albums.map((album) => ({
          id: album.id,
          code: album.code,
          title: album.title,
          trackCount: album.tracks.length,
        })),
        recommendations: identity.recommendations.map((item) => ({
          id: item.id,
          kind: item.kind,
          severity: item.severity,
          currentNames: item.currentNames,
          proposedName: item.proposedName,
          evidence: item.evidence,
          trackCount: item.trackCount,
        })),
        searchText: searchValues.join(" "),
      };
    }),
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
  const seeds = new Map<string, IdentitySeed>();
  const exactCredits = new Set<string>();

  const append = (definition: Omit<IdentitySeed, "occurrences">, occurrence: IdentityOccurrence) => {
    const seed = seeds.get(definition.id) ?? { ...definition, occurrences: [] };
    seed.occurrences.push(occurrence);
    seeds.set(seed.id, seed);
  };

  for (const entry of flatTracks) {
    const composers = uniqueStrings(entry.track.composers ?? []);
    if (composers.length) {
      for (const credit of composers) {
        exactCredits.add(credit);
        append(seedForCredit(credit, entry.album.code), { entry, credit, missingPublic: false });
      }
      continue;
    }

    const writers = structuredWriterNames(entry.track);
    if (writers.length) {
      for (const writer of writers) append(seedForCredit(writer, entry.album.code), { entry, missingPublic: true });
    } else {
      append({
        id: "unassigned-composer",
        preferredName: "Compositeur non renseigné",
        source: "unassigned",
      }, { entry, missingPublic: true });
    }
  }

  const identities = [...seeds.values()].map(buildIdentity);
  const profilesWithTracks = new Set(identities.map((identity) => identity.publicProfile?.slug).filter(Boolean));
  for (const profile of canonicalComposerProfiles) {
    if (!profilesWithTracks.has(profile.slug)) identities.push(profileOnlyIdentity(profile));
  }
  addSpellingRecommendations(identities);
  identities.sort((left, right) => (
    priority(left.harvestStatus, left.editorialStatus) - priority(right.harvestStatus, right.editorialStatus)
    || right.trackCount - left.trackCount
    || left.preferredName.localeCompare(right.preferredName, "fr", { sensitivity: "base" })
  ));

  const publicIdentities = identities.filter((identity) => identity.publicProfile);
  const actionRequired = identities.filter((identity) => identity.harvestStatus !== "clean" || identity.editorialStatus === "incomplete");
  const globalTrackViews = flatTracks.map((entry) => trackView(entry, uniqueStrings(entry.track.composers ?? [])));
  const failedAlbums = options.failedAlbums ?? [];
  return {
    capturedAt: options.capturedAt ?? new Date().toISOString(),
    sourceAlbumCount: options.sourceAlbumCount ?? albums.length + failedAlbums.length,
    failedAlbums,
    identities,
    metrics: {
      albumCount: albums.length,
      trackCount: flatTracks.length,
      exactCreditCount: exactCredits.size,
      identityCount: identities.length,
      actionRequiredCount: actionRequired.length,
      cleanupRequiredCount: identities.filter((identity) => identity.harvestStatus === "cleanup-required").length,
      reviewRequiredCount: identities.filter((identity) => identity.harvestStatus === "review-required").length,
      cleanCount: identities.filter((identity) => identity.harvestStatus === "clean").length,
      noCreditCount: identities.filter((identity) => identity.harvestStatus === "no-credit").length,
      publicIdentityCount: publicIdentities.length,
      harvestOnlyCount: identities.filter((identity) => identity.source === "harvest-only" || identity.source === "unassigned").length,
      incompleteEditorialCount: identities.filter((identity) => identity.editorialStatus === "incomplete").length,
      missingBioFrCount: publicIdentities.filter((identity) => !identity.publicProfile?.hasBioFr).length,
      missingBioEnCount: publicIdentities.filter((identity) => !identity.publicProfile?.hasBioEn).length,
      missingPortraitCount: publicIdentities.filter((identity) => !identity.publicProfile?.hasPortrait).length,
      missingPublicCreditCount: flatTracks.filter((entry) => !uniqueStrings(entry.track.composers ?? []).length && structuredWriterNames(entry.track).length > 0).length,
      differentRightHoldersCount: flatTracks.filter((entry) => uniqueStrings(entry.track.composers ?? []).length > 0 && structuredWriterNames(entry.track).length > 0 && rightsState(entry.track) === "different").length,
      missingStructuredCreditCount: globalTrackViews.filter((track) => track.rightsState === "missing-structured").length,
    },
  };
}
