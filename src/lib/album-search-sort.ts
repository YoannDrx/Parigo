export type AlbumSearchSort = "relevance" | "recent" | "oldest";

function isAlbumSearchSort(value: string | null): value is AlbumSearchSort {
  return value === "relevance" || value === "recent" || value === "oldest";
}

export function initialAlbumSearchSort(query: string, sortParam: string | null): AlbumSearchSort {
  if (isAlbumSearchSort(sortParam)) return sortParam;
  return query.trim() ? "relevance" : "recent";
}

export function albumSearchSortAfterQueryChange(
  previousQuery: string,
  nextQuery: string,
  currentSort: AlbumSearchSort,
): AlbumSearchSort {
  const hadQuery = Boolean(previousQuery.trim());
  const hasQuery = Boolean(nextQuery.trim());
  if (!hadQuery && hasQuery) return "relevance";
  if (hadQuery && !hasQuery) return "recent";
  return currentSort;
}
