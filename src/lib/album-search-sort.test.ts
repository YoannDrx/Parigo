import { describe, expect, it } from "vitest";
import { albumSearchSortAfterQueryChange, initialAlbumSearchSort } from "./album-search-sort";

describe("album search sort policy", () => {
  it("uses newest-first browsing without a query", () => {
    expect(initialAlbumSearchSort("", null)).toBe("recent");
  });

  it("uses relevance when a URL query has no explicit sort", () => {
    expect(initialAlbumSearchSort("Surf Fiction", null)).toBe("relevance");
  });

  it("preserves an explicit URL sort while searching", () => {
    expect(initialAlbumSearchSort("Surf Fiction", "recent")).toBe("recent");
    expect(initialAlbumSearchSort("Surf Fiction", "oldest")).toBe("oldest");
  });

  it("switches to relevance only when a search starts", () => {
    expect(albumSearchSortAfterQueryChange("", "Surf", "recent")).toBe("relevance");
    expect(albumSearchSortAfterQueryChange("Surf", "Surf Fiction", "oldest")).toBe("oldest");
  });

  it("restores newest-first browsing when the query is cleared", () => {
    expect(albumSearchSortAfterQueryChange("Surf Fiction", "", "oldest")).toBe("recent");
  });
});
