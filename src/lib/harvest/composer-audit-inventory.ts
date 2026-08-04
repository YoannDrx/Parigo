import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { PARIGO_LABEL_ID } from "@/config/catalog";
import { getAlbum, getAlbumDiscovery } from "./catalog";
import {
  buildComposerAudit,
  summarizeComposerAudit,
  type ComposerAuditAlbum,
  type ComposerAuditSummaryData,
} from "./composer-audit";
import { HarvestError } from "./errors";

const MAX_PARIGO_ALBUMS = 100;
const LOAD_CONCURRENCY = 6;

const getCachedAdminComposerAlbum = unstable_cache(
  async (id: string) => (await getAlbum(id)).album,
  ["admin-parigo-composer-audit-album-v1"],
  { revalidate: 300, tags: ["admin-composers"] },
);

const getAdminComposerAlbum = cache(getCachedAdminComposerAlbum);

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

async function loadParigoComposerAuditSummary(): Promise<ComposerAuditSummaryData> {
  const discovery = await getAlbumDiscovery({
    label: PARIGO_LABEL_ID,
    limit: MAX_PARIGO_ALBUMS,
    sort: "recent",
  });

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
  const failedAlbums = results.flatMap((result) => result.state === "unavailable" ? [result.album] : []);

  return summarizeComposerAudit(buildComposerAudit(albums, {
    capturedAt: new Date().toISOString(),
    failedAlbums,
    sourceAlbumCount: discovery.total,
  }));
}

const getCachedParigoComposerAuditSummary = unstable_cache(
  loadParigoComposerAuditSummary,
  ["admin-parigo-composer-audit-summary-v9"],
  { revalidate: 300, tags: ["admin-composers"] },
);

export const getParigoComposerAuditSummary = cache(getCachedParigoComposerAuditSummary);

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
  const identitySummary = summary.identities.find((identity) => identity.id === identityId);
  if (!identitySummary?.albums.some((album) => album.id === albumId)) {
    return { capturedAt: summary.capturedAt };
  }

  const sourceAlbum = await getAdminComposerAlbum(albumId);
  const rebuilt = buildComposerAudit([sourceAlbum], {
    capturedAt: summary.capturedAt,
    sourceAlbumCount: summary.sourceAlbumCount,
  }).identities.find((identity) => identity.id === identityId);
  const album = rebuilt?.albums.find((item) => item.id === albumId);

  return {
    capturedAt: summary.capturedAt,
    album,
  };
}
