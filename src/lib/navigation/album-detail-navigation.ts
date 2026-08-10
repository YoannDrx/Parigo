import "server-only";

import { getCachedAlbumDiscovery } from "@/lib/harvest/catalog-cache";
import type { Album } from "@/types";
import type { DetailNavigation, DetailNavigationItem } from "./detail-navigation";

const PAGE_SIZE = 100;

function toNavigationItem(album: Album): DetailNavigationItem {
  return {
    href: `/albums/${album.id}`,
    title: album.title,
    image: album.cover,
    imageFit: "contain",
    eyebrow: album.code || album.label,
  };
}

export async function getAlbumDetailNavigation(album: Album): Promise<DetailNavigation> {
  if (!album.labelSlug) return {};

  let offset = 0;
  let previousPageLastItem: Album | undefined;

  while (true) {
    const page = await getCachedAlbumDiscovery({
      label: album.labelSlug,
      limit: PAGE_SIZE,
      offset,
      sort: "recent",
    });
    const currentIndex = page.items.findIndex((item) => item.id === album.id);

    if (currentIndex >= 0) {
      const previous = currentIndex > 0 ? page.items[currentIndex - 1] : previousPageLastItem;
      let next = page.items[currentIndex + 1];

      if (!next && offset + page.items.length < page.total) {
        const nextPage = await getCachedAlbumDiscovery({
          label: album.labelSlug,
          limit: PAGE_SIZE,
          offset: offset + page.items.length,
          sort: "recent",
        });
        next = nextPage.items[0];
      }

      return {
        previous: previous ? toNavigationItem(previous) : undefined,
        next: next ? toNavigationItem(next) : undefined,
      };
    }

    if (!page.items.length || offset + page.items.length >= page.total) return {};
    previousPageLastItem = page.items.at(-1);
    offset += page.items.length;
  }
}
