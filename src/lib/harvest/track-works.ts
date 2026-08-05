import type { Track } from "@/types";

export type TrackWorkIdentity = Pick<Track, "id" | "mainTrackId" | "isAlternate">;

/**
 * Returns the Harvest ID that identifies the musical work represented by a row.
 * An orphan alternate/stem is deliberately not promoted to a new public work.
 */
export function harvestMainWorkId(track: TrackWorkIdentity): string | undefined {
  const mainTrackId = track.mainTrackId?.trim();
  if (mainTrackId) return mainTrackId;
  return track.isAlternate ? undefined : track.id;
}

export function isOrphanHarvestVariant(track: TrackWorkIdentity): boolean {
  return Boolean(track.isAlternate && !track.mainTrackId?.trim());
}
