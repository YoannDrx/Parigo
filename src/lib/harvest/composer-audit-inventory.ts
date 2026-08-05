import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { PARIGO_LABEL_ID } from "@/config/catalog";
import { getAlbum, getAlbumDiscovery } from "./catalog";
import { getParigoHarvestComposerInventory } from "./composer-inventory";
import {
  buildComposerAudit,
  buildComposerAuditCsvRows,
  summarizeComposerAudit,
  type ComposerAuditAlbum,
  type ComposerAuditSummaryData,
  type ComposerAuditCsvRow,
} from "./composer-audit";
import { HarvestError } from "./errors";

const MAX_PARIGO_ALBUMS = 100;
const LOAD_CONCURRENCY = 6;

const getCachedAdminComposerAlbum = unstable_cache(
  async (id: string) => (await getAlbum(id, undefined, { resolveStemDetails: true })).album,
  ["admin-parigo-composer-audit-album-v1"],
  { revalidate: 300, tags: ["admin-composers"] },
);

const getAdminComposerAlbum = cache(getCachedAdminComposerAlbum);
const getCachedAdminComposerAlbumDetail = unstable_cache(
  async (id: string) => (await getAlbum(id)).album,
  ["admin-parigo-composer-audit-album-detail-v1"],
  { revalidate: 300, tags: ["admin-composers"] },
);
const getAdminComposerAlbumDetail = cache(getCachedAdminComposerAlbumDetail);
type AdminComposerAlbum = Awaited<ReturnType<typeof getAdminComposerAlbum>>;
const recentAuditAlbums = new Map<string, { expiresAt: number; album: AdminComposerAlbum }>();

async function mapConcurrent<T, R>(values: T[], limit: number, task: (value: T) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(values.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await task(values[index]);
    }
  }));
  return output;
}

async function loadParigoComposerAuditSource() {
  const [discovery, indexResult] = await Promise.all([
    getAlbumDiscovery({
      label: PARIGO_LABEL_ID,
      limit: MAX_PARIGO_ALBUMS,
      sort: "recent",
    }),
    getParigoHarvestComposerInventory().then((value) => ({ state: "ready" as const, value })).catch(() => ({ state: "unavailable" as const })),
  ]);

  if (discovery.total > discovery.items.length) {
    throw new HarvestError(
      `Audit compositeurs incomplet : ${discovery.items.length}/${discovery.total} albums Parigo chargés`,
      "HARVEST_INVALID_RESPONSE",
      502,
      false,
    );
  }

  const results = await mapConcurrent(discovery.items, LOAD_CONCURRENCY, async (album) => {
    try {
      return { state: "ready" as const, album: await getAdminComposerAlbum(album.id) };
    } catch {
      return {
        state: "unavailable" as const,
        album: { id: album.id, code: album.code, title: album.title },
      };
    }
  });

  const albums = results.flatMap((result) => result.state === "ready" ? [result.album] : []);
  for (const album of albums) recentAuditAlbums.set(album.id, { expiresAt: Date.now() + 5 * 60_000, album });
  const failedAlbums = results.flatMap((result) => result.state === "unavailable" ? [result.album] : []);
  const unresolvedVariants = albums.flatMap((album) => {
    const rows: Array<{ albumId: string; albumCode?: string; albumTitle: string; parentTrackId: string; variantId: string; kind: "stem" }> = [];
    const visit = (track: NonNullable<typeof album.tracks>[number]) => {
      for (const variantId of track.unresolvedStemIds ?? []) rows.push({
        albumId: album.id,
        albumCode: album.code,
        albumTitle: album.title,
        parentTrackId: track.id,
        variantId,
        kind: "stem",
      });
      for (const alternate of track.alternateTracks ?? []) visit(alternate);
    };
    for (const track of album.tracks ?? []) visit(track);
    return rows;
  });

  return {
    albums,
    failedAlbums,
    unresolvedVariants,
    sourceAlbumCount: discovery.total,
    capturedAt: new Date().toISOString(),
    indexedComposerNamesByTrackId: indexResult.state === "ready" ? indexResult.value.indexedComposerNamesByTrackId : undefined,
    indexCapturedAt: indexResult.state === "ready" ? indexResult.value.capturedAt : undefined,
  };
}

async function loadParigoComposerAuditSummary(): Promise<ComposerAuditSummaryData> {
  const source = await loadParigoComposerAuditSource();
  return summarizeComposerAudit(buildComposerAudit(source.albums, source));
}

const getCachedParigoComposerAuditSummary = unstable_cache(
  loadParigoComposerAuditSummary,
  ["admin-parigo-composer-audit-summary-v10"],
  { revalidate: 300, tags: ["admin-composers"] },
);

export const getParigoComposerAuditSummary = cache(getCachedParigoComposerAuditSummary);

export async function getParigoComposerAuditCsvRows(filters: {
  q?: string;
  profile?: string;
  album?: string;
  anomaly?: string;
  status?: string;
} = {}): Promise<{ capturedAt: string; rows: ComposerAuditCsvRow[] }> {
  const source = await loadParigoComposerAuditSource();
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const query = normalize(filters.q ?? "");
  const rows = buildComposerAuditCsvRows(source.albums).filter((row) => {
    if (filters.profile && filters.profile !== "all" && !row.publicProfileSlugs.includes(filters.profile)) return false;
    if (filters.album && filters.album !== "all" && row.albumCode !== filters.album && row.albumId !== filters.album) return false;
    if (filters.anomaly && filters.anomaly !== "all" && !row.anomalies.includes(filters.anomaly as ComposerAuditCsvRow["anomalies"][number])) return false;
    if (filters.status && filters.status !== "all" && row.status !== filters.status) return false;
    return !query || normalize([
      row.albumCode,
      row.albumTitle,
      row.trackId,
      row.title,
      ...row.composerRaw,
      ...row.expectedComposerNames,
      ...row.structuredWriterNames,
    ].filter(Boolean).join(" ")).includes(query);
  });
  return { capturedAt: source.capturedAt, rows };
}

/**
 * Loads only the albums needed by an expanded row. The complete audit is too
 * large for the Next.js Data Cache, while a single identity remains small and
 * can safely be fetched lazily by the dashboard.
 */
export async function getParigoComposerAuditAlbum(identityId: string, albumId: string): Promise<{
  album?: ComposerAuditAlbum;
  capturedAt: string;
}> {
  const summary = await getParigoComposerAuditSummary();
  const identitySummary = [...summary.identities, ...summary.otherIdentities].find((identity) => identity.id === identityId);
  if (!identitySummary?.albums.some((album) => album.id === albumId)) {
    return { capturedAt: summary.capturedAt };
  }

  const recent = recentAuditAlbums.get(albumId);
  const [sourceAlbum, index] = await Promise.all([
    recent && recent.expiresAt > Date.now() ? Promise.resolve(recent.album) : getAdminComposerAlbumDetail(albumId),
    getParigoHarvestComposerInventory().catch(() => undefined),
  ]);
  const rebuilt = buildComposerAudit([sourceAlbum], {
    capturedAt: summary.capturedAt,
    sourceAlbumCount: summary.sourceAlbumCount,
    indexedComposerNamesByTrackId: index?.indexedComposerNamesByTrackId,
    indexCapturedAt: index?.capturedAt,
  });
  const identityIds = identitySummary.identityIds ?? [identityId];
  const sourceAlbums = rebuilt.identities
    .filter((identity) => identityIds.includes(identity.id) || (identityId.startsWith("profile-") && identity.publicProfile?.slug === identityId.slice("profile-".length)))
    .flatMap((identity) => identity.albums.filter((item) => item.id === albumId));
  const first = sourceAlbums[0];
  const tracksById = new Map<string, ComposerAuditAlbum["tracks"][number]>();
  for (const source of sourceAlbums) {
    for (const track of source.tracks) {
      const current = tracksById.get(track.id);
      tracksById.set(track.id, current
        ? {
            ...current,
            matchedCreditNames: [...new Set([...current.matchedCreditNames, ...track.matchedCreditNames])],
            expectedComposerNames: [...new Set([...current.expectedComposerNames, ...track.expectedComposerNames])],
          }
        : track);
    }
  }
  const tracks = [...tracksById.values()];
  const works = first ? [...new Map(sourceAlbums.flatMap((source) => source.works).map((work) => [work.id, {
    ...work,
    tracks: tracks.filter((track) => (track.workId ?? `orphan:${track.id}`) === work.id),
    variants: tracks.filter((track) => (track.workId ?? `orphan:${track.id}`) === work.id && track.variantKind !== "main"),
    mainTrack: tracks.find((track) => (track.workId ?? `orphan:${track.id}`) === work.id && track.variantKind === "main"),
  }])).values()] : [];
  const album = first ? { ...first, tracks, works } : undefined;

  return {
    capturedAt: summary.capturedAt,
    album,
  };
}
