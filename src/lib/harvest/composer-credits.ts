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

export interface HarvestComposerSearchItem {
  id: string;
  name: string;
  count: number;
}

type ComposerCreditTrack = Pick<
  Track,
  "id" | "albumId" | "albumCode" | "albumTitle" | "composers"
>;

type ComposerSearchTrack = Pick<Track, "id" | "composers">;

const COMPOSER_SOCIETY_NAME = "(?:SACEM|NS|BMI|ASCAP|PRS|SESAC|TONO|GEMA|SIAE|SOCAN|APRA(?:\\s+AMCOS)?|STIM|KODA|BUMA(?:/STEMRA)?|SABAM|SUISA|AKM|IMRO|MCPS|PPL|JASRAC|KOMCA|SAMRO)";
const COMPOSER_SOCIETY_SUFFIX = new RegExp(
  `(?:\\s*\\(\\s*${COMPOSER_SOCIETY_NAME}\\b[^)]*\\)?|\\s+${COMPOSER_SOCIETY_NAME}\\b[^)]*)\\s*$`,
  "i",
);
const COMPOSER_CREDIT_SEPARATOR = /\s+\/\s+|\s*;\s*|\s*\|\s*|[\r\n]+/;
const COMPOSER_SHARE_PREFIX = /^(?:\d{6,}\)?\s*)?(?:\d+(?:[.,]\d+)?\s*%\s*)+/;
const HAS_LETTER = /\p{Letter}/u;
const SHORT_NUMERIC_STAGE_NAME = /^\d{1,5}$/;

export function harvestComposerCreditBaseName(value: string): string {
  return value.replace(COMPOSER_SOCIETY_SUFFIX, "").trim();
}

/**
 * Extrait les personnes d'un crédit Harvest, y compris lorsque plusieurs noms,
 * un IPI, une part et une société ont été concaténés dans le même champ.
 */
export function harvestComposerCreditNames(value: string): string[] {
  const names = value
    .trim()
    .split(COMPOSER_CREDIT_SEPARATOR)
    .map((part) => part.replace(COMPOSER_SHARE_PREFIX, "").trim())
    .map(harvestComposerCreditBaseName)
    // Numeric stage names such as `2080` are valid credits. Keep short,
    // standalone values while rejecting IPI-shaped numeric fragments (the
    // upstream cleanup contract already treats six or more digits as an IPI).
    .filter((name) => name && (HAS_LETTER.test(name) || SHORT_NUMERIC_STAGE_NAME.test(name)));

  return [...new Map(names.map((name) => [normalizeHarvestComposerSearchValue(name), name])).values()];
}

export function normalizeHarvestComposerCredit(value: string): string {
  return harvestComposerCreditBaseName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Clés strictes d'une identité de compositeur. La seconde clé conserve les
 * mêmes mots mais ignore leur ordre afin de rapprocher `Prénom Nom` et
 * `Nom Prénom`, sans introduire de ressemblance orthographique approximative.
 */
export function harvestComposerCreditLookupKeys(value: string): string[] {
  const normalized = normalizeHarvestComposerCredit(value);
  if (!normalized) return [];
  const orderedTokens = normalized.split(" ").filter(Boolean).sort();
  return [...new Set([
    `exact:${normalized}`,
    ...(orderedTokens.length > 1 ? [`words:${orderedTokens.join(" ")}`] : []),
  ])];
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

/**
 * Regroupe les libellés dénormalisés de Cloud Search par identité textuelle.
 * La fonction reste volontairement indépendante du registre éditorial Parigo :
 * toute personne créditée dans le catalogue Harvest visible peut être proposée.
 */
export function collectHarvestComposerSearchItems(
  tracks: ComposerSearchTrack[],
  query: string,
): HarvestComposerSearchItem[] {
  const normalizedQuery = normalizeHarvestComposerSearchValue(query);
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const identities = new Map<string, {
    trackIds: Set<string>;
    names: Map<string, { name: string; trackIds: Set<string>; plain: boolean }>;
  }>();

  for (const track of tracks) {
    for (const rawCredit of new Set(track.composers ?? [])) {
      const trimmedCredit = rawCredit.trim();
      for (const name of harvestComposerCreditNames(trimmedCredit)) {
        const identityKey = normalizeHarvestComposerSearchValue(name);
        const identityTokens = new Set(identityKey.split(" ").filter(Boolean));
        const matchesInAnyOrder = queryTokens.length > 1 && queryTokens.every((token) => identityTokens.has(token));
        if (!identityKey.includes(normalizedQuery) && !matchesInAnyOrder) continue;

        const identity = identities.get(identityKey) ?? {
          trackIds: new Set<string>(),
          names: new Map<string, { name: string; trackIds: Set<string>; plain: boolean }>(),
        };
        identity.trackIds.add(track.id);
        const candidate = identity.names.get(name) ?? {
          name,
          trackIds: new Set<string>(),
          plain: trimmedCredit === name,
        };
        candidate.trackIds.add(track.id);
        candidate.plain ||= trimmedCredit === name;
        identity.names.set(name, candidate);
        identities.set(identityKey, identity);
      }
    }
  }

  return [...identities.entries()]
    .map(([normalized, identity]) => {
      const preferred = [...identity.names.values()].sort((left, right) => (
        Number(right.plain) - Number(left.plain)
        || right.trackIds.size - left.trackIds.size
        || left.name.localeCompare(right.name, "fr", { sensitivity: "base" })
      ))[0];
      return {
        id: preferred.name,
        name: preferred.name,
        count: identity.trackIds.size,
        normalized,
      };
    })
    .sort((left, right) => {
      const leftRank = left.normalized === normalizedQuery ? 0 : left.normalized.startsWith(normalizedQuery) ? 1 : 2;
      const rightRank = right.normalized === normalizedQuery ? 0 : right.normalized.startsWith(normalizedQuery) ? 1 : 2;
      return leftRank - rightRank
        || right.count - left.count
        || left.name.localeCompare(right.name, "fr", { sensitivity: "base" });
    })
    .map(({ id, name, count }) => ({ id, name, count }));
}

function replacementCharacterPattern(value: string): RegExp {
  const escapedParts = value
    .normalize("NFC")
    .split("\uFFFD")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`^${escapedParts.join(".")}$`, "iu");
}

/**
 * Retrouve le libellé encore présent dans l'index Cloud Search lorsqu'une
 * fiche piste fraîche a déjà réparé un caractère de remplacement. Cette clé
 * transitoire permet de continuer à interroger l'index pendant sa propagation.
 */
export function findIndexedHarvestComposerName(
  indexedComposers: string[],
  freshComposers: string[],
  freshName: string,
): string | undefined {
  const normalizedFreshName = normalizeHarvestComposerSearchValue(freshName);
  const freshIndex = freshComposers.findIndex((composer) => (
    harvestComposerCreditNames(composer).some((name) => normalizeHarvestComposerSearchValue(name) === normalizedFreshName)
  ));
  const indexedNames = indexedComposers.flatMap(harvestComposerCreditNames);
  const indexedAtSamePosition = freshIndex >= 0
    ? harvestComposerCreditNames(indexedComposers[freshIndex] ?? "")
    : [];

  return [...indexedAtSamePosition, ...indexedNames].find((name) => (
    name.includes("\uFFFD") && replacementCharacterPattern(name).test(freshName)
  ));
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
  const allowed = new Set(names.flatMap(harvestComposerCreditLookupKeys));
  return credits.some((credit) => harvestComposerCreditLookupKeys(credit.normalized).some((key) => allowed.has(key)));
}
