import { describe, expect, it } from "vitest";
import { compareAlbumsNewestFirst } from "./album-sort";

describe("compareAlbumsNewestFirst", () => {
  it("sorts full release dates from newest to oldest", () => {
    const albums = [
      { title: "Older", releaseDate: "2022-03-01", code: "PGO0040" },
      { title: "Newest", releaseDate: "2026-02-12", code: "PGO0054" },
      { title: "Middle", releaseDate: "2024-09-18", code: "PGO0048" },
    ];
    expect(albums.sort(compareAlbumsNewestFirst).map((album) => album.title)).toEqual(["Newest", "Middle", "Older"]);
  });

  it("uses year, then catalogue code, and places undated albums last", () => {
    const albums = [
      { title: "Undated", code: "PGO0099" },
      { title: "Earlier code", year: 2025, code: "PGO0049" },
      { title: "Later code", year: 2025, code: "PGO0051" },
      { title: "Old", year: 2020, code: "PGO0030" },
    ];
    expect(albums.sort(compareAlbumsNewestFirst).map((album) => album.title)).toEqual([
      "Later code",
      "Earlier code",
      "Old",
      "Undated",
    ]);
  });
});
