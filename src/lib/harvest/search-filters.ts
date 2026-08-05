import "server-only";

import type {
  CatalogCategory,
  SearchFilterGroup,
  SearchFilterGroupKey,
  SearchFilterItem,
} from "@/types";
import { getCategories, getLabels } from "./catalog";

const groupKeys: Record<string, SearchFilterGroupKey> = {
  genre: "genre",
  moods: "moods",
  "music for": "musicFor",
  period: "period",
  instruments: "instruments",
  area: "area",
};

function categoryItem(item: CatalogCategory, parentId?: string): SearchFilterItem {
  const id = `ATT_${item.id.replace(/^ATT_/i, "")}`;
  const children = item.children?.map((child) => categoryItem(child, id));
  return {
    id,
    name: item.name,
    parentId,
    ...(children?.length ? { children } : {}),
  };
}

function itemCount(items: SearchFilterItem[]): number {
  return items.reduce((total, item) => total + 1 + itemCount(item.children ?? []), 0);
}

export async function getSearchFilterGroups(
  language: "fr" | "en",
): Promise<SearchFilterGroup[]> {
  const [categoryGroups, labels] = await Promise.all([
    getCategories(language),
    getLabels(),
  ]);
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
    ...categoryGroups.flatMap((group): SearchFilterGroup[] => {
      const key = groupKeys[group.name.toLocaleLowerCase("en")];
      if (!key) return [];
      const items = (group.children ?? []).map((item) => categoryItem(item));
      const total = itemCount(items);
      return [{
        key,
        label: group.name,
        selection: "include-exclude",
        total,
        available: total,
        items,
      }];
    }),
  ];
}
