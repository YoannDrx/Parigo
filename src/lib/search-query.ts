export function normalizeSearchQuery(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function stripLegacySearchQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 2) return trimmed;
  const first = trimmed[0];
  const last = trimmed.at(-1);
  return (first === last && (first === '"' || first === "'"))
    ? trimmed.slice(1, -1).trim()
    : trimmed;
}

const CATALOG_IDENTIFIER_WITH_SEPARATOR = /^(?=.*\d)[a-z0-9]+(?:[-_#.\/\s][a-z0-9]+)+$/i;
const COMPACT_CATALOG_IDENTIFIER = /^(?=.*[a-z])(?=.*\d)[a-z0-9]{4,}$/i;
const CATALOG_PREFIX = /^[A-Z]{2,8}$/;

export function isCatalogIdentifier(value: string): boolean {
  const query = stripLegacySearchQuotes(value);
  return CATALOG_IDENTIFIER_WITH_SEPARATOR.test(query)
    || COMPACT_CATALOG_IDENTIFIER.test(query)
    || CATALOG_PREFIX.test(query);
}

export function isTranslatableSearchQuery(value: string): boolean {
  const query = stripLegacySearchQuotes(value);
  if (!query || /^\d+(?:[.,]\d+)?$/.test(query)) return false;
  if (isCatalogIdentifier(query)) return false;
  return /\p{L}/u.test(query);
}
