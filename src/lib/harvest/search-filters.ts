import "server-only";

import type {
  CatalogCategory,
  SearchFilterGroup,
  SearchFilterGroupKey,
  SearchFilterItem,
} from "@/types";
import { getCategories, getLabels, getStyles } from "./catalog";

const groupKeys: Record<string, SearchFilterGroupKey> = {
  genre: "genre",
  moods: "moods",
  "music for": "musicFor",
  period: "period",
  instruments: "instruments",
  area: "area",
};
const FILTER_CACHE_TTL_MS = 60 * 60 * 1000;
const filterCache = new Map<"fr" | "en", { expiresAt: number; value: Promise<SearchFilterGroup[]> }>();

function stableCategoryId(id: string): string {
  return `ATT_${id.replace(/^ATT_/i, "")}`;
}

function categoryItem(
  canonical: CatalogCategory,
  localized?: CatalogCategory,
  parentId?: string,
  parentPath: string[] = [],
): SearchFilterItem {
  const id = stableCategoryId(canonical.id);
  const canonicalName = canonical.name;
  const localizedName = localized?.name || canonicalName;
  const localizedChildren = new Map((localized?.children ?? []).map((child) => [stableCategoryId(child.id), child]));
  const path = [...parentPath, localizedName];
  const children = canonical.children?.map((child) => categoryItem(
    child,
    localizedChildren.get(stableCategoryId(child.id)),
    id,
    path,
  ));
  return {
    id,
    name: localizedName,
    canonicalName,
    localizedName,
    parentId,
    path,
    ...(children?.length ? { children } : {}),
  };
}

function itemCount(items: SearchFilterItem[]): number {
  return items.reduce((total, item) => total + 1 + itemCount(item.children ?? []), 0);
}

async function loadSearchFilterGroups(
  language: "fr" | "en",
): Promise<SearchFilterGroup[]> {
  const canonicalCategoriesPromise = getCategories("en");
  const canonicalStylesPromise = getStyles();
  const [canonicalCategoryGroups, localizedCategoryGroups, labels, canonicalStyles, localizedStyles] = await Promise.all([
    canonicalCategoriesPromise,
    language === "en" ? canonicalCategoriesPromise : getCategories(language),
    getLabels(),
    canonicalStylesPromise,
    language === "en" ? canonicalStylesPromise : getStyles(language),
  ]);
  const localizedCategoryById = new Map(localizedCategoryGroups.map((group) => [stableCategoryId(group.id), group]));
  const localizedStyleById = new Map(localizedStyles.map((style) => [style.id, style]));
  return [
    {
      key: "labels",
      label: "Labels",
      selection: "include-only",
      total: labels.length,
      available: labels.length,
      items: labels.map((label) => ({ id: label.id, name: label.name })),
    },
    {
      key: "composers",
      label: language === "fr" ? "Compositeurs" : "Composers",
      selection: "include-only",
      total: 0,
      available: 0,
      items: [],
      source: "catalog",
      state: "available",
      remote: "harvest-track-composers",
    },
    {
      key: "styles",
      label: language === "fr" ? "Styles" : "Styles",
      selection: "include-exclude",
      total: canonicalStyles.length,
      available: canonicalStyles.length,
      items: canonicalStyles.map((style) => {
        const localizedName = localizedStyleById.get(style.id)?.name || style.name;
        return ({
        id: style.id,
        name: localizedName,
        canonicalName: style.name,
        localizedName,
        path: [localizedName],
        count: style.trackCount,
      }); }),
      description: language === "fr"
        ? "Les compteurs correspondent à des occurrences de catalogue, pas à des albums distincts."
        : "Counts represent catalog occurrences, not distinct albums.",
    },
    ...canonicalCategoryGroups.flatMap((group): SearchFilterGroup[] => {
      const key = groupKeys[group.name.toLocaleLowerCase("en")];
      if (!key) return [];
      const localizedGroup = localizedCategoryById.get(stableCategoryId(group.id));
      const localizedChildren = new Map((localizedGroup?.children ?? []).map((child) => [stableCategoryId(child.id), child]));
      const items = (group.children ?? []).map((item) => categoryItem(
        item,
        localizedChildren.get(stableCategoryId(item.id)),
        undefined,
        [localizedGroup?.name || group.name],
      ));
      const total = itemCount(items);
      return [{
        key,
        label: localizedGroup?.name || group.name,
        selection: "include-exclude",
        total,
        available: total,
        items,
      }];
    }),
  ];
}

export async function getSearchFilterGroups(language: "fr" | "en"): Promise<SearchFilterGroup[]> {
  const cached = filterCache.get(language);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const value = loadSearchFilterGroups(language).catch((error) => {
    filterCache.delete(language);
    throw error;
  });
  filterCache.set(language, { expiresAt: Date.now() + FILTER_CACHE_TTL_MS, value });
  return value;
}
