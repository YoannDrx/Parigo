import type { Track } from "@/types";

export interface HarvestComposerCredit {
  id: string;
  name: string;
  normalized: string;
  trackCount: number;
  albumIds: string[];
  albumCodes: string[];
  albumTitles: string[];
}

type ComposerCreditTrack = Pick<
  Track,
  "id" | "albumId" | "albumCode" | "albumTitle" | "composers"
>;

export function normalizeHarvestComposerCredit(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\((?:SACEM|NS|BMI|ASCAP|PRS|SESAC)[^)]*\)\s*$/i, "")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Normalisation réservée à la recherche textuelle d'un libellé brut.
 * Elle conserve notamment les suffixes de société (SACEM, NS, BMI…), car ils
 * font partie de la valeur exacte que Harvest permet de sélectionner.
 */
export function normalizeHarvestComposerSearchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[’']/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (const character of value.normalize("NFC")) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function harvestComposerCreditId(value: string): string {
  const readable = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72) || "credit";
  return `harvest-${readable}-${stableHash(value)}`;
}

export function collectHarvestComposerCredits(tracks: ComposerCreditTrack[]): HarvestComposerCredit[] {
  const credits = new Map<string, {
    id: string;
    name: string;
    normalized: string;
    trackIds: Set<string>;
    albumIds: Set<string>;
    albumCodes: Set<string>;
    albumTitles: Set<string>;
  }>();

  for (const track of tracks) {
    for (const rawCredit of track.composers ?? []) {
      const name = rawCredit.trim();
      const normalized = normalizeHarvestComposerCredit(name);
      if (!name || !normalized) continue;
      const id = harvestComposerCreditId(name);
      const credit = credits.get(id) ?? {
        id,
        name,
        normalized,
        trackIds: new Set<string>(),
        albumIds: new Set<string>(),
        albumCodes: new Set<string>(),
        albumTitles: new Set<string>(),
      };
      credit.trackIds.add(track.id);
      if (track.albumId) credit.albumIds.add(track.albumId);
      if (track.albumCode) credit.albumCodes.add(track.albumCode);
      if (track.albumTitle) credit.albumTitles.add(track.albumTitle);
      credits.set(id, credit);
    }
  }

  return [...credits.values()]
    .map((credit) => ({
      id: credit.id,
      name: credit.name,
      normalized: credit.normalized,
      trackCount: credit.trackIds.size,
      albumIds: [...credit.albumIds].sort(),
      albumCodes: [...credit.albumCodes].sort(),
      albumTitles: [...credit.albumTitles].sort((left, right) => left.localeCompare(right, "fr")),
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "fr", { sensitivity: "base" }));
}

export function composerCreditMatches(
  names: string[],
  credits: Pick<HarvestComposerCredit, "normalized">[],
): boolean {
  const allowed = new Set(names.map(normalizeHarvestComposerCredit).filter(Boolean));
  return credits.some((credit) => allowed.has(credit.normalized));
}
