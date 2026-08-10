import { describe, expect, it } from "vitest";
import { buildDetailNavigation } from "./detail-navigation";

const items = [
  { id: "one", title: "One" },
  { id: "two", title: "Two" },
  { id: "three", title: "Three" },
];

const toNavigationItem = (item: (typeof items)[number]) => ({
  href: `/items/${item.id}`,
  title: item.title,
});

describe("buildDetailNavigation", () => {
  it("returns the previous and next items without wrapping", () => {
    expect(buildDetailNavigation(items, "two", (item) => item.id, toNavigationItem)).toEqual({
      previous: { href: "/items/one", title: "One" },
      next: { href: "/items/three", title: "Three" },
    });
  });

  it("omits a direction at the edge of the collection", () => {
    expect(buildDetailNavigation(items, "one", (item) => item.id, toNavigationItem)).toEqual({
      previous: undefined,
      next: { href: "/items/two", title: "Two" },
    });
  });

  it("returns no navigation when the current item is absent", () => {
    expect(buildDetailNavigation(items, "missing", (item) => item.id, toNavigationItem)).toEqual({});
  });
});
