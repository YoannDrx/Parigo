import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHarvestJsonWithTimeout, getHarvestTokenExpiry, isHarvestRequestRetrySafe } from "./client";

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

describe("Harvest retry safety", () => {
  it("does not retry GET endpoints that mutate member state", () => {
    expect(isHarvestRequestRetrySafe("/getmember/secret", "GET")).toBe(true);
    expect(isHarvestRequestRetrySafe("/addtofavourites/secret/Track/1", "GET")).toBe(false);
    expect(isHarvestRequestRetrySafe("/removeplaylist/secret/1", "GET")).toBe(false);
    expect(isHarvestRequestRetrySafe("/expiretoken/secret", "GET")).toBe(false);
  });

  it("only retries documented POST reads", () => {
    expect(isHarvestRequestRetrySafe("/cloudsearch/secret", "POST")).toBe(true);
    expect(isHarvestRequestRetrySafe("/autocomplete/secret", "POST")).toBe(true);
    expect(isHarvestRequestRetrySafe("/addmemberplaylist/secret", "POST")).toBe(false);
  });
});

describe("Harvest token expiry", () => {
  it("applies the UTCOffset supplied with a naive token expiry", () => {
    expect(getHarvestTokenExpiry({
      Expiry: "2026-07-29T00:24:11.477",
      UTCOffset: 10,
    })).toBe(Date.parse("2026-07-28T14:24:11.477Z"));
  });
});
