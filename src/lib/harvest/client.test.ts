import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHarvestJsonWithTimeout } from "./client";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchHarvestJsonWithTimeout", () => {
  it("keeps the timeout active while the response body is being read", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      void init;
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("{"));
        },
      });
      return new Response(stream, { status: 200 });
    });

    await expect(fetchHarvestJsonWithTimeout("https://harvest.invalid/hanging-body", {}, 20))
      .rejects.toMatchObject({
        code: "HARVEST_UNAVAILABLE",
        status: 503,
        retryable: true,
      });
  });

  it("returns the response and parsed payload when the body completes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await fetchHarvestJsonWithTimeout("https://harvest.invalid/ok", {}, 100);

    expect(result.response.status).toBe(200);
    expect(result.payload).toEqual({ ok: true });
  });
});
