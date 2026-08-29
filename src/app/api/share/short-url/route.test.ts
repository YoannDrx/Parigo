import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createHarvestShortUrl: vi.fn(),
  assertSameOrigin: vi.fn(),
  logEvent: vi.fn(),
}));

vi.mock("@/lib/harvest/api", () => ({ requestId: () => "share-request-1" }));
vi.mock("@/lib/harvest/session", () => ({ assertSameOrigin: mocks.assertSameOrigin }));
vi.mock("@/lib/harvest/short-url", () => ({ createHarvestShortUrl: mocks.createHarvestShortUrl }));
vi.mock("@/lib/logger", () => ({ logEvent: mocks.logEvent }));

import { POST } from "./route";

function request(body: unknown) {
  return new Request("https://parigo.invalid/api/share/short-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/share/short-url", () => {
  beforeEach(() => {
    mocks.createHarvestShortUrl.mockReset();
    mocks.assertSameOrigin.mockReset();
    mocks.logEvent.mockReset();
  });

  it("returns the validated Harvest short URL", async () => {
    mocks.createHarvestShortUrl.mockResolvedValue("https://hrvst.co/p/qfs73");

    const response = await POST(request({ path: "/albums/album-slug?track=track-1" }) as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toEqual({ url: "https://hrvst.co/p/qfs73", shortened: true });
    expect(mocks.createHarvestShortUrl).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/[^/]+\/albums\/album-slug\?track=track-1$/));
  });

  it("falls back to the canonical Parigo URL when Harvest fails or returns malformed data", async () => {
    mocks.createHarvestShortUrl.mockRejectedValue(new Error("HARVEST_INVALID_RESPONSE"));

    const response = await POST(request({ path: "/albums/album-slug?track=track-1" }) as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.shortened).toBe(false);
    expect(payload.data.url).toMatch(/^https:\/\/[^/]+\/albums\/album-slug\?track=track-1$/);
    expect(mocks.logEvent).toHaveBeenCalledWith(expect.objectContaining({ message: "short_url_fallback", requestId: "share-request-1" }));
  });

  it.each([
    {},
    { path: "https://evil.invalid/albums/a?track=t" },
    { path: "//evil.invalid/albums/a?track=t" },
    { path: "/search?track=t" },
    { path: "/albums/a" },
    { path: "/albums/a?track=one&track=two" },
  ])("rejects invalid and non-album paths: %o", async (body) => {
    const response = await POST(request(body) as never);
    expect(response.status).toBe(400);
    expect(mocks.createHarvestShortUrl).not.toHaveBeenCalled();
  });
});
