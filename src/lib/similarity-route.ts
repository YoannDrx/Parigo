import "server-only";

import { apiError } from "@/lib/harvest/api";
import { HarvestError } from "@/lib/harvest/errors";
import type { Track } from "@/types";

const MAX_SIMILARITY_JSON_BYTES = 16 * 1024;

const PUBLIC_CODES: Record<string, string> = {
  AIMS_ANALYSIS_PENDING: "SIMILARITY_ANALYSIS_PENDING",
  AIMS_FEATURE_UNAVAILABLE: "SIMILARITY_FEATURE_UNAVAILABLE",
  AIMS_INVALID_SEED: "SIMILARITY_INVALID_SEED",
  AIMS_TIMEOUT: "SIMILARITY_TIMEOUT",
  AIMS_UNAVAILABLE: "SIMILARITY_UNAVAILABLE",
};

export function publicSimilarityTrack(track: Track): Track {
  if (!track.audioUrl) return track;
  try {
    const audioUrl = new URL(track.audioUrl);
    if (/aims|harvest/i.test(audioUrl.searchParams.get("source") || "")) {
      audioUrl.searchParams.delete("source");
      return { ...track, audioUrl: audioUrl.toString() };
    }
  } catch {
    // Keep non-standard catalogue URLs untouched; the player already supports them.
  }
  return track;
}

export async function readSimilarityJson(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_SIMILARITY_JSON_BYTES) {
    throw new HarvestError("Request body is too large", "VALIDATION_FAILED", 413, false);
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_SIMILARITY_JSON_BYTES) {
    throw new HarvestError("Request body is too large", "VALIDATION_FAILED", 413, false);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HarvestError("Request body must be valid JSON", "VALIDATION_FAILED", 400, false);
  }
}

export async function similarityApiError(error: unknown, requestId: string): Promise<Response> {
  const response = apiError(error, requestId);
  const payload = await response.json() as { error?: { code?: string; message?: string; retryable?: boolean; requestId?: string } };
  const code = PUBLIC_CODES[payload.error?.code || ""] || payload.error?.code || "SIMILARITY_UNAVAILABLE";
  const providerMentioned = /aims|harvest/i.test(payload.error?.message || "");
  const message = providerMentioned
    ? "La recherche de similarité est temporairement indisponible."
    : payload.error?.message || "La recherche de similarité est temporairement indisponible.";

  return Response.json(
    { error: { code, message, retryable: Boolean(payload.error?.retryable), requestId } },
    { status: response.status, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } },
  );
}
