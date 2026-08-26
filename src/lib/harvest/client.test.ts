import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchHarvestJsonWithTimeout,
  getHarvestTokenExpiry,
  hasSearchSimilarCapability,
  isHarvestRequestRetrySafe,
  shouldLogSuccessfulHarvestRequest,
} from "./client";

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
    expect(isHarvestRequestRetrySafe("/addmembersavesearch/secret", "POST")).toBe(false);
    expect(isHarvestRequestRetrySafe("/searchmembersavesearches/secret", "POST")).toBe(false);
  });
});

describe("Harvest success log sampling", () => {
  it("samples one percent of ordinary successful requests", () => {
    expect(shouldLogSuccessfulHarvestRequest(200, 0.009)).toBe(true);
    expect(shouldLogSuccessfulHarvestRequest(200, 0.01)).toBe(false);
    expect(shouldLogSuccessfulHarvestRequest(200, 0.8)).toBe(false);
  });

  it("always keeps slow successful requests", () => {
    expect(shouldLogSuccessfulHarvestRequest(2_000, 0.99)).toBe(true);
    expect(shouldLogSuccessfulHarvestRequest(8_000, 0.99)).toBe(true);
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

describe("Harvest capabilities", () => {
  it("only enables similar-search UI when Harvest publishes an AIMS provider", () => {
    expect(hasSearchSimilarCapability({ SearchSimilarInfo: [] })).toBe(false);
    expect(hasSearchSimilarCapability({})).toBe(false);
    expect(hasSearchSimilarCapability({ SearchSimilarInfo: [{ Provider: "Cyanite" }] })).toBe(false);
    expect(hasSearchSimilarCapability({ SearchSimilarInfo: [{ Provider: "AIMS" }] })).toBe(true);
  });
});
