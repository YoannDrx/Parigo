import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTrack: vi.fn(),
}));

vi.mock("react", () => ({
  cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => {
    const entries = new Map<string, ReturnType<T>>();
    return ((...args: Parameters<T>) => {
      const key = JSON.stringify(args);
      if (!entries.has(key)) entries.set(key, fn(...args) as ReturnType<T>);
      return entries.get(key);
    }) as T;
  },
}));

vi.mock("./catalog", () => ({
  getTrack: mocks.getTrack,
  getAlbum: vi.fn(),
  getAlbums: vi.fn(),
  getAlbumDiscovery: vi.fn(),
  getLabel: vi.fn(),
  getLabels: vi.fn(),
  getPlaylist: vi.fn(),
  getPlaylistDiscovery: vi.fn(),
  getPlaylists: vi.fn(),
  getStyles: vi.fn(),
  getCategories: vi.fn(),
}));

import { getCachedTrack } from "./catalog-cache";

describe("getCachedTrack", () => {
  beforeEach(() => {
    mocks.getTrack.mockReset();
  });

  it("deduplicates repeated anonymous track reads for the same id", async () => {
    mocks.getTrack.mockResolvedValue({ id: "track-1", title: "Track 1" });

    const first = await getCachedTrack("track-1");
    const second = await getCachedTrack("track-1");

    expect(first).toEqual({ id: "track-1", title: "Track 1" });
    expect(second).toBe(first);
    expect(mocks.getTrack).toHaveBeenCalledTimes(1);
    expect(mocks.getTrack).toHaveBeenCalledWith("track-1");
  });
});
