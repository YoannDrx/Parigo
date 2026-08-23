import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCachedTrack: vi.fn(),
}));

vi.mock("@/lib/harvest/catalog-cache", () => ({
  getCachedTrack: mocks.getCachedTrack,
}));

vi.mock("@/components/institutional/ContactExperience", () => ({
  ContactExperience: () => null,
}));

import ContactPage from "./page";

describe("ContactPage", () => {
  beforeEach(() => {
    mocks.getCachedTrack.mockReset();
  });

  it("does not read Harvest when no track is requested", async () => {
    const result = await ContactPage({ searchParams: Promise.resolve({}) });

    expect(mocks.getCachedTrack).not.toHaveBeenCalled();
    expect(result.props).toMatchObject({ track: null, requestedTrackId: undefined });
  });

  it("uses the cached public track lookup", async () => {
    const track = { id: "track-1", title: "Track 1" };
    mocks.getCachedTrack.mockResolvedValue(track);

    const result = await ContactPage({ searchParams: Promise.resolve({ track: "track-1" }) });

    expect(mocks.getCachedTrack).toHaveBeenCalledOnce();
    expect(mocks.getCachedTrack).toHaveBeenCalledWith("track-1");
    expect(result.props).toMatchObject({ track, requestedTrackId: "track-1" });
  });

  it("keeps the form usable with the raw reference when the track is unknown", async () => {
    mocks.getCachedTrack.mockRejectedValue(new Error("not found"));

    const result = await ContactPage({ searchParams: Promise.resolve({ track: "unknown" }) });

    expect(result.props).toMatchObject({ track: null, requestedTrackId: "unknown" });
  });
});
