export interface AimsRankedHit {
  idClient: string;
  score?: number;
}

export interface AimsPromptResult {
  queryId: string;
  didYouMean?: string;
  totalApproximate?: number;
  hits: AimsRankedHit[];
}

export type AimsPromptErrorCode =
  | "PROMPT_UNDERSTANDING_FAILED"
  | "AIMS_UNAVAILABLE"
  | "AIMS_TIMEOUT"
  | "AIMS_INDEX_MISMATCH";

export interface AimsHydrationResult<T> {
  items: T[];
  missingIds: string[];
}

export function normalizeAimsClientId(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
}

/**
 * Harvest remains the display/audio source, but its batch response order must
 * never replace AIMS relevance order. Missing IDs are explicit so an index
 * synchronization problem can be measured instead of silently hidden.
 */
export function preserveAimsRankAfterHydration<T extends { id: string }>(
  hits: AimsRankedHit[],
  hydrated: T[],
): AimsHydrationResult<T> {
  const byId = new Map(hydrated.map((item) => [item.id, item]));
  const seen = new Set<string>();
  const items: T[] = [];
  const missingIds: string[] = [];

  for (const hit of hits) {
    const id = normalizeAimsClientId(hit.idClient);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const item = byId.get(id);
    if (item) items.push(item);
    else missingIds.push(id);
  }

  return { items, missingIds };
}

export const AIMS_FILTER_FIELD_MAP = {
  labels: "label_name",
  genre: "genres",
  moods: "moods",
  musicFor: "music_for",
  instruments: "instruments",
  bpmMin: "bpm",
  bpmMax: "bpm",
  durationMin: "duration",
  durationMax: "duration",
  styles: "tags",
  period: null,
  area: null,
  composer: null,
} as const;
