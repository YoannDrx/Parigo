export interface DetailNavigationItem {
  href: string;
  title: string;
  image?: string | null;
  imageFit?: "cover" | "contain";
  eyebrow?: string | null;
}

export interface DetailNavigation {
  previous?: DetailNavigationItem;
  next?: DetailNavigationItem;
}

export function buildDetailNavigation<T>(
  items: T[],
  currentId: string,
  getId: (item: T) => string,
  toNavigationItem: (item: T) => DetailNavigationItem,
): DetailNavigation {
  const currentIndex = items.findIndex((item) => getId(item) === currentId);
  if (currentIndex < 0) return {};

  return {
    previous: currentIndex > 0 ? toNavigationItem(items[currentIndex - 1]) : undefined,
    next: currentIndex < items.length - 1 ? toNavigationItem(items[currentIndex + 1]) : undefined,
  };
}
