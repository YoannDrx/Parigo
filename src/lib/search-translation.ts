import "server-only";
import type { QueryResolution } from "@/types";
import { isTranslatableSearchQuery, normalizeSearchQuery } from "./search-query";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const TRANSLATION_TIMEOUT_MS = 3_000;
const translationCache = new Map<string, { expiresAt: number; effective?: string }>();

interface DeepLTranslation {
  detected_source_language?: string;
  text?: string;
}

interface DeepLResponse {
  translations?: DeepLTranslation[];
}

interface TranslationOptions {
  authKey?: string;
  apiUrl?: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

function deeplApiUrl(authKey: string): string {
  if (process.env.DEEPL_API_URL?.trim()) return process.env.DEEPL_API_URL.trim();
  return authKey.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
}

function searchReadyTranslation(value: string): string {
  return value.trim().replace(/^(?:a|an|the)\s+/i, "").trim();
}

export async function translateFrenchSearchQuery(
  query: string,
  options: TranslationOptions = {},
): Promise<QueryResolution | undefined> {
  const original = query.trim();
  if (!isTranslatableSearchQuery(original)) return undefined;

  const authKey = options.authKey ?? process.env.DEEPL_AUTH_KEY?.trim();
  if (!authKey) return undefined;

  const now = options.now?.() ?? Date.now();
  const cacheKey = normalizeSearchQuery(original);
  const cached = translationCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.effective
      ? { original, effective: cached.effective, source: "machine-translation" }
      : undefined;
  }

  try {
    const response = await (options.fetchImpl ?? fetch)(options.apiUrl ?? deeplApiUrl(authKey), {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${authKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: [original],
        target_lang: "EN",
      }),
      signal: AbortSignal.timeout(TRANSLATION_TIMEOUT_MS),
    });
    if (!response.ok) return undefined;

    const payload = await response.json() as DeepLResponse;
    const translation = payload.translations?.[0];
    const effective = translation?.text ? searchReadyTranslation(translation.text) : "";
    const resolution = translation?.detected_source_language?.toUpperCase() === "FR"
      && effective
      && normalizeSearchQuery(effective) !== cacheKey
      ? {
          original,
          effective,
          source: "machine-translation" as const,
        }
      : undefined;
    translationCache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, effective: resolution?.effective });
    if (translationCache.size > 500) {
      const oldestKey = translationCache.keys().next().value;
      if (oldestKey) translationCache.delete(oldestKey);
    }
    return resolution;
  } catch {
    return undefined;
  }
}

export function clearSearchTranslationCache(): void {
  translationCache.clear();
}
