import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SimilarityApiError,
  fetchSimilarityCapabilities,
  prepareSimilarityUpload,
  runSimilaritySearch,
} from "./api-client";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("similarity browser client", () => {
  it("reads the normalized public capabilities", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      data: {
        track: { advertised: true, enabled: true, multiSeed: true, prioritizeBpm: true },
        prompt: { advertised: false, enabled: false },
        upload: { advertised: true, enabled: false, contentTypes: ["audio/mpeg", "audio/wav"], maxBytes: 125829120, maxDurationSeconds: 900 },
        externalUrl: { advertised: true, enabled: false, platforms: ["youtube"] },
        playlistSuggestions: true,
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await expect(fetchSimilarityCapabilities()).resolves.toMatchObject({ track: { enabled: true } });
  });

  it("treats a logical analysis-pending envelope carried by HTTP 202 as an error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      error: { code: "SIMILARITY_ANALYSIS_PENDING", message: "Analysis pending", retryable: true, requestId: "request-1" },
    }), { status: 202, headers: { "Content-Type": "application/json" } }));

    await expect(runSimilaritySearch({ type: "upload", referenceToken: "x".repeat(40) }))
      .rejects.toEqual(expect.objectContaining<Partial<SimilarityApiError>>({
        code: "SIMILARITY_ANALYSIS_PENDING",
        status: 202,
        retryable: true,
        requestId: "request-1",
      }));
  });

  it("sends only upload metadata to the BFF", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      data: { uploadUrl: "https://storage.invalid/presigned", uploadToken: "opaque", contentType: "audio/mpeg", expiresInSeconds: 900 },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await prepareSimilarityUpload({ fileName: "reference.mp3", contentType: "audio/mpeg", size: 1_024 });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.body).toBe(JSON.stringify({ fileName: "reference.mp3", contentType: "audio/mpeg", size: 1_024 }));
    expect(init?.body).not.toBeInstanceOf(Blob);
  });
});
