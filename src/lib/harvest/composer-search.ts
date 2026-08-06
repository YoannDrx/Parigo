import "server-only";
import { cloudSearch, getTracksByIds } from "./catalog";
import {
  findIndexedHarvestComposerName,
  normalizeHarvestComposerSearchValue,
} from "./composer-credits";
import { hasInvalidComposerCharacter } from "./composer-naming";
import type { Track } from "@/types";

function hasInvalidComposerCredit(track: Pick<Track, "composers">): boolean {
  return (track.composers ?? []).some(hasInvalidComposerCharacter);
}

export async function refreshInvalidComposerTracks(
  tracks: Track[],
  authenticatedMemberToken?: string,
  source = "composer-credit-refresh",
): Promise<Track[]> {
  const ids = [...new Set(tracks.filter(hasInvalidComposerCredit).map((track) => track.id))];
  if (!ids.length) return tracks;

  try {
    const freshTracks = await getTracksByIds(ids, authenticatedMemberToken, undefined, source);
    const freshById = new Map(freshTracks.map((track) => [track.id, track]));
    return tracks.map((track) => {
      const fresh = freshById.get(track.id);
      if (!fresh || hasInvalidComposerCredit(fresh)) return track;
      return {
        ...track,
        composers: fresh.composers,
        rightHolders: fresh.rightHolders,
        lyrics: fresh.lyrics,
        alternateTracks: fresh.alternateTracks,
      };
    });
  } catch {
    // L'autocomplétion reste utilisable si le détail Harvest est
    // momentanément indisponible ; la prochaine requête retentera la lecture.
    return tracks;
  }
}

export async function findStaleIndexedComposerQuery(
  freshName: string,
  authenticatedMemberToken?: string,
): Promise<string | undefined> {
  const normalized = normalizeHarvestComposerSearchValue(freshName);
  const tokens = normalized.split(" ").filter((token) => token.length >= 2);
  const probes = [...new Set([
    tokens[0]?.slice(0, 4),
    tokens.at(-1)?.slice(0, 4),
  ].filter((probe): probe is string => Boolean(probe && probe.length >= 2)))];

  for (const probe of probes) {
    const indexed = await cloudSearch({
      view: "Track",
      query: "%",
      textScope: "title",
      composerQuery: probe,
      composerMatch: "contains",
      skip: 0,
      limit: 100,
      type: "main",
      sort: "Alphabetic_Asc",
    }, authenticatedMemberToken);
    const candidates = indexed.tracks.filter(hasInvalidComposerCredit);
    if (!candidates.length) continue;

    const freshTracks = await getTracksByIds(
      candidates.map((track) => track.id),
      authenticatedMemberToken,
      undefined,
      "composer-index-refresh",
    );
    const indexedById = new Map(candidates.map((track) => [track.id, track]));
    for (const freshTrack of freshTracks) {
      const containsFreshName = (freshTrack.composers ?? []).some((composer) => (
        normalizeHarvestComposerSearchValue(composer) === normalized
      ));
      if (!containsFreshName) continue;
      const indexedTrack = indexedById.get(freshTrack.id);
      if (!indexedTrack) continue;
      const staleName = findIndexedHarvestComposerName(
        indexedTrack.composers ?? [],
        freshTrack.composers ?? [],
        freshName,
      );
      if (staleName) return staleName;
    }
  }

  return undefined;
}
