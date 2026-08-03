import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { PARIGO_LABEL_ID } from "@/config/catalog";
import { getCachedAlbum, getCachedAlbumDiscovery } from "./catalog-cache";
import { buildComposerAudit, type ComposerAuditData } from "./composer-audit";
import { HarvestError } from "./errors";

const MAX_PARIGO_ALBUMS = 100;
const LOAD_CONCURRENCY = 6;

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

async function loadParigoComposerAudit(): Promise<ComposerAuditData> {
  const discovery = await getCachedAlbumDiscovery({
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
      return { state: "ready" as const, album: (await getCachedAlbum(album.id)).album };
    } catch {
      return {
        state: "unavailable" as const,
        album: { id: album.id, code: album.code, title: album.title },
      };
    }
  });

  const albums = results.flatMap((result) => result.state === "ready" ? [result.album] : []);
  const failedAlbums = results.flatMap((result) => result.state === "unavailable" ? [result.album] : []);

  return buildComposerAudit(albums, {
    capturedAt: new Date().toISOString(),
    failedAlbums,
    sourceAlbumCount: discovery.total,
  });
}

const getCachedParigoComposerAudit = unstable_cache(
  loadParigoComposerAudit,
  ["admin-parigo-composer-audit-v3"],
  { revalidate: 300, tags: ["catalog", "albums", "tracks", "composers", "admin-composers"] },
);

export const getParigoComposerAudit = cache(getCachedParigoComposerAudit);
