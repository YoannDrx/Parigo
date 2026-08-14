import type {
  AutocompleteItem,
  SearchFilterGroup,
  SearchFilterGroupKey,
  SearchFilterItem,
} from "@/types";
import { containsNormalizedExpression, normalizeSearchText } from "./search-normalization";

const FILTER_PARAM: Record<SearchFilterGroupKey, "labels" | "styles" | "categories" | "composer"> = {
  labels: "labels",
  composers: "composer",
  styles: "styles",
  genre: "categories",
  moods: "categories",
  musicFor: "categories",
  period: "categories",
  instruments: "categories",
  area: "categories",
};

function flattenItems(items: SearchFilterItem[]): SearchFilterItem[] {
  return items.flatMap((item) => [item, ...flattenItems(item.children ?? [])]);
}

function matchedName(query: string, item: SearchFilterItem): string | undefined {
  const names = [...new Set([
    item.localizedName,
    item.canonicalName,
    item.name,
  ].filter((name): name is string => Boolean(name?.trim())))];
  return names.find((name) => containsNormalizedExpression(query, name));
}

function displayName(item: SearchFilterItem): string {
  const localized = item.localizedName || item.name;
  const canonical = item.canonicalName || item.name;
  return normalizeSearchText(localized) === normalizeSearchText(canonical)
    ? localized
    : `${localized} (${canonical})`;
}

export function resolveTaxonomySuggestions(
  query: string,
  groups: SearchFilterGroup[],
  language: "fr" | "en" = "fr",
): AutocompleteItem[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  return groups.flatMap((group) => {
    if (group.key === "labels" || group.key === "composers") return [];
    return flattenItems(group.items).flatMap((item) => {
      const term = matchedName(trimmedQuery, item);
      if (!term) return [];
      const params = new URLSearchParams({ q: trimmedQuery, view: "tracks", type: "main" });
      params.set(FILTER_PARAM[group.key], group.key === "composers" ? item.name : item.id);
      return [{
        id: item.id,
        kind: "filter" as const,
        label: `${group.label} · ${displayName(item)}`,
        subtitle: group.key === "styles"
          ? language === "fr" ? "Style trouvé" : "Matching style"
          : language === "fr" ? "Catégorie trouvée" : "Matching category",
        href: `/search?${params.toString()}`,
        filterGroup: group.key,
        canonicalName: item.canonicalName || item.name,
        localizedName: item.localizedName || item.name,
        matchedTerm: term,
      }];
    });
  }).filter((item, index, items) => (
    items.findIndex((candidate) => candidate.id === item.id && candidate.filterGroup === item.filterGroup) === index
  ));
}
