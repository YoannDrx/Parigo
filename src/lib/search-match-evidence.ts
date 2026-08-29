import type { Album, SearchMatchEvidence, SearchMatchField, Track } from "@/types";
import { containsNormalizedExpression, normalizeSearchText, searchTerms } from "./search-normalization";

type Candidate = {
  field: SearchMatchField;
  values: Array<string | null | undefined>;
};

function normalizeCatalogReference(value: string): string {
  const compact = normalizeSearchText(value).replace(/\s+/g, "");
  const parts = compact.match(/^([a-z]+)0*(\d+)$/);
  return parts ? `${parts[1]}${Number.parseInt(parts[2], 10)}` : compact;
}

function catalogReferenceMatches(value: string, query: string): boolean {
  const normalizedValue = normalizeCatalogReference(value);
  const normalizedQuery = normalizeCatalogReference(query);
  if (!normalizedValue || !normalizedQuery) return false;
  if (normalizedValue === normalizedQuery || normalizedValue.startsWith(normalizedQuery)) return true;
  const querySuffix = normalizedQuery.slice(normalizedValue.length);
  return normalizedQuery.startsWith(normalizedValue) && /^\d+$/.test(querySuffix);
}

function evidenceFromCandidates(query: string, candidates: Candidate[]): SearchMatchEvidence[] {
  const terms = searchTerms(query);
  if (!terms.length) return [];

  const seen = new Set<string>();
  return candidates.flatMap(({ field, values }) => values.flatMap((rawValue) => {
    const value = rawValue?.trim();
    if (!value) return [];
    const matchedTerms = field === "catalogReference" && catalogReferenceMatches(value, query)
      ? terms
      : terms.filter((term) => containsNormalizedExpression(value, term));
    if (!matchedTerms.length) return [];
    const key = `${field}:${value.toLocaleLowerCase("en")}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ field, value, matchedTerms }];
  }));
}

export function trackSearchEvidence(track: Track, query: string, album?: Album): SearchMatchEvidence[] {
  return evidenceFromCandidates(query, [
    { field: "trackTitle", values: [track.title] },
    { field: "albumTitle", values: [track.albumTitle, album?.title] },
    { field: "description", values: [track.description] },
    { field: "keyword", values: track.keywords ?? [] },
    { field: "genre", values: track.genres },
    { field: "mood", values: track.moods },
    { field: "musicFor", values: track.musicFor ?? [] },
    { field: "instrument", values: track.instruments ?? [] },
    { field: "albumKeyword", values: album?.keywords ?? [] },
    { field: "albumDescription", values: [album?.description] },
    { field: "catalogReference", values: [track.albumCode, track.cdCode, album?.code] },
  ]);
}

export function albumSearchEvidence(album: Album, query: string): SearchMatchEvidence[] {
  return evidenceFromCandidates(query, [
    { field: "albumTitle", values: [album.title] },
    { field: "albumDescription", values: [album.description] },
    { field: "albumKeyword", values: album.keywords ?? [] },
    { field: "genre", values: album.genres },
    { field: "mood", values: album.moods ?? [] },
    { field: "catalogReference", values: [album.code] },
  ]);
}

export function entitySearchEvidence(
  query: string,
  candidates: Candidate[],
): SearchMatchEvidence[] {
  return evidenceFromCandidates(query, candidates);
}

export function explainsSearchQuery(evidence: SearchMatchEvidence[], query: string): boolean {
  const expectedTerms = searchTerms(query);
  const explainedTerms = new Set(evidence.flatMap((item) => item.matchedTerms));
  return expectedTerms.length > 0 && expectedTerms.every((term) => explainedTerms.has(term));
}

export function prioritizeTitleEvidence<T extends { matchEvidence?: SearchMatchEvidence[] }>(
  items: readonly T[],
  field: "trackTitle" | "albumTitle" | "playlistTitle",
): T[] {
  return items.toSorted((left, right) => (
    Number(Boolean(right.matchEvidence?.some((evidence) => evidence.field === field)))
    - Number(Boolean(left.matchEvidence?.some((evidence) => evidence.field === field)))
  ));
}
