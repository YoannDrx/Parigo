import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { PARIGO_LABEL_ID } from "@/config/catalog";
import type { Track } from "@/types";
import {
  collectCanonicalComposerSummaries,
  getCanonicalComposerProfile,
  getCanonicalComposerProfileByLegacySlug,
  getCanonicalComposerProfileForCredit,
  type CanonicalComposerSummary,
} from "@/lib/composers/profiles";
import { HarvestError } from "./errors";
import { cloudSearch } from "./catalog";
import { collectHarvestComposerCredits, type HarvestComposerCredit } from "./composer-credits";

export interface ParigoHarvestComposerInventory {
  capturedAt: string;
  labelId: string;
  trackCount: number;
  credits: HarvestComposerCredit[];
  profiles: CanonicalComposerSummary[];
  indexedComposerNamesByTrackId: Record<string, string[]>;
}

const PAGE_SIZE = 100;
const MAX_TRACKS = 10_000;

async function loadParigoHarvestComposerInventory(): Promise<ParigoHarvestComposerInventory> {
  const tracks: Track[] = [];
  let skip = 0;
  let total = 1;

  while (skip < total) {
    const page = await cloudSearch({
      view: "Track",
      skip,
      limit: PAGE_SIZE,
      labels: [PARIGO_LABEL_ID],
      sort: "ReleaseDate_Desc",
    });
    total = page.total;
    if (total > MAX_TRACKS) {
      throw new HarvestError(
        `L’inventaire compositeurs Parigo dépasse la limite contrôlée de ${MAX_TRACKS} pistes`,
        "HARVEST_INVALID_RESPONSE",
        502,
        false,
      );
    }
    if (!page.tracks.length) break;
    tracks.push(...page.tracks);
    skip += page.tracks.length;
  }

  if (tracks.length < total) {
    throw new HarvestError(
      `Inventaire compositeurs Harvest incomplet : ${tracks.length}/${total} pistes chargées`,
      "HARVEST_INVALID_RESPONSE",
      502,
      false,
    );
  }

  return {
    capturedAt: new Date().toISOString(),
    labelId: PARIGO_LABEL_ID,
    trackCount: tracks.length,
    credits: collectHarvestComposerCredits(tracks),
    profiles: collectCanonicalComposerSummaries(tracks),
    indexedComposerNamesByTrackId: Object.fromEntries(tracks.map((track) => [track.id, track.composers ?? []])),
  };
}

const getCachedInventory = unstable_cache(
  loadParigoHarvestComposerInventory,
  ["parigo-harvest-composer-inventory-v11-right-holder-ids"],
  { revalidate: 300, tags: ["catalog", "tracks", "composers", "filters"] },
);

export const getParigoHarvestComposerInventory = cache(getCachedInventory);

export async function getParigoHarvestComposerCredit(id: string): Promise<HarvestComposerCredit | undefined> {
  const inventory = await getParigoHarvestComposerInventory();
  return inventory.credits.find((credit) => credit.id === id);
}

export async function getParigoCanonicalComposer(slug: string): Promise<CanonicalComposerSummary | undefined> {
  const inventory = await getParigoHarvestComposerInventory();
  return inventory.profiles.find((profile) => profile.slug === slug);
}

export async function resolveCanonicalComposerSlug(slug: string): Promise<string | undefined> {
  const direct = getCanonicalComposerProfile(slug);
  if (direct) return direct.slug;
  const legacy = getCanonicalComposerProfileByLegacySlug(slug);
  if (legacy) return legacy.slug;
  if (!slug.startsWith("harvest-")) return undefined;

  const inventory = await getParigoHarvestComposerInventory();
  const credit = inventory.credits.find((item) => item.id === slug);
  if (!credit) return undefined;
  const global = getCanonicalComposerProfileForCredit(credit.name);
  if (global) return global.slug;
  for (const albumCode of credit.albumCodes) {
    const scoped = getCanonicalComposerProfileForCredit(credit.name, albumCode);
    if (scoped) return scoped.slug;
  }
  return undefined;
}
