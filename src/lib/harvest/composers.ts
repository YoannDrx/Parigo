import "server-only";

import type { Album } from "@/types";
import type { ComposerProfile } from "@/lib/editorial/contracts";
import { normalizeHarvestCredit } from "@/lib/editorial/contracts";
import { PARIGO_LABEL_ID } from "@/config/catalog";
import { getCachedAlbum, getCachedAlbumDiscovery } from "./catalog-cache";

export type ComposerDiscographyState = "ready" | "empty" | "unavailable";

export interface ComposerAlbumResult {
  state: ComposerDiscographyState;
  albums: Album[];
}

interface ComposerAlbumDependencies {
  searchAlbums: typeof getCachedAlbumDiscovery;
  loadAlbum: typeof getCachedAlbum;
}

export function albumCreditsMatch(
  album: Album & { tracks: NonNullable<Album["tracks"]> },
  aliases: string[],
): boolean {
  const allowed = new Set(aliases.map(normalizeHarvestCredit));
  return album.tracks.some((track) => (
    track.composers?.some((composer) => allowed.has(normalizeHarvestCredit(composer)))
  ));
}

export async function resolveComposerAlbums(
  profile: ComposerProfile,
  dependencies: ComposerAlbumDependencies,
): Promise<ComposerAlbumResult> {
  const verifiedCodes = new Set(profile.verifiedAlbums?.map((relation) => relation.code) ?? []);
  const excludedCodes = new Set(profile.excludedAlbums?.map((relation) => relation.code) ?? []);
  if (profile.harvestAliases.length === 0 && verifiedCodes.size === 0) return { state: "empty", albums: [] };

  try {
    const searches = await Promise.all(profile.harvestAliases.map((query) => (
      dependencies.searchAlbums({
        label: PARIGO_LABEL_ID,
        query,
        limit: 100,
        sort: "recent",
      })
    )));
    const verifiedInventory = verifiedCodes.size > 0
      ? await dependencies.searchAlbums({
          label: PARIGO_LABEL_ID,
          limit: 100,
          sort: "recent",
        })
      : null;
    const verifiedCandidates = verifiedInventory?.items.filter((album) => album.code && verifiedCodes.has(album.code)) ?? [];
    if (verifiedCodes.size > 0 && new Set(verifiedCandidates.map((album) => album.code)).size !== verifiedCodes.size) {
      throw new Error(`Verified album relation could not be resolved for ${profile.slug}`);
    }
    const candidates = [...new Map(
      [...searches.flatMap((result) => result.items), ...verifiedCandidates].map((album) => [album.id, album]),
    ).values()];
    const details = await Promise.all(candidates.map((album) => dependencies.loadAlbum(album.id)));
    const albums = details
      .map((result) => result.album)
      .filter((album) => (
        !album.code
        || !excludedCodes.has(album.code)
      ))
      .filter((album) => (
        (album.code ? verifiedCodes.has(album.code) : false)
        || albumCreditsMatch(album, profile.harvestAliases)
      ))
      .sort((left, right) => (
        (right.releaseDate ? Date.parse(right.releaseDate) : 0)
        - (left.releaseDate ? Date.parse(left.releaseDate) : 0)
      ));

    return { state: albums.length > 0 ? "ready" : "empty", albums };
  } catch {
    return { state: "unavailable", albums: [] };
  }
}

export async function getComposerAlbums(profile: ComposerProfile): Promise<ComposerAlbumResult> {
  return resolveComposerAlbums(profile, {
    searchAlbums: getCachedAlbumDiscovery,
    loadAlbum: getCachedAlbum,
  });
}
