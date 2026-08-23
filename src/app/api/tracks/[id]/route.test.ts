import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCachedTrack: vi.fn(),
  getTrack: vi.fn(),
  readHarvestSession: vi.fn(),
}));

vi.mock("@/lib/harvest/catalog-cache", () => ({
  getCachedTrack: mocks.getCachedTrack,
}));

vi.mock("@/lib/harvest/catalog", () => ({
  getTrack: mocks.getTrack,
}));

vi.mock("@/lib/harvest/session", () => ({
  readHarvestSession: mocks.readHarvestSession,
}));

vi.mock("@/lib/harvest/api", () => ({
  requestId: () => "request-1",
  apiError: vi.fn(),
}));

import { GET } from "./route";

describe("GET /api/tracks/[id]", () => {
  beforeEach(() => {
    mocks.getCachedTrack.mockReset();
    mocks.getTrack.mockReset();
    mocks.readHarvestSession.mockReset();
  });

  it("uses the shared public cache for anonymous sessions", async () => {
    mocks.readHarvestSession.mockResolvedValue(null);
    mocks.getCachedTrack.mockResolvedValue({ id: "track-1", title: "Track 1" });

    const response = await GET(
      new Request("https://parigo.invalid/api/tracks/track-1"),
      { params: Promise.resolve({ id: "track-1" }) },
    );

    expect(mocks.getCachedTrack).toHaveBeenCalledWith("track-1");
    expect(mocks.getTrack).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toBe("public, s-maxage=300, stale-while-revalidate=900");
  });

  it("keeps member reads private and uncached", async () => {
    mocks.readHarvestSession.mockResolvedValue({ memberToken: "member-token" });
    mocks.getTrack.mockResolvedValue({ id: "track-1", title: "Private Track" });

    const response = await GET(
      new Request("https://parigo.invalid/api/tracks/track-1"),
      { params: Promise.resolve({ id: "track-1" }) },
    );

    expect(mocks.getTrack).toHaveBeenCalledWith("track-1", "member-token");
    expect(mocks.getCachedTrack).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
