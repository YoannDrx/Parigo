import { NextRequest, NextResponse } from "next/server";
import { apiError, requestId } from "@/lib/harvest/api";
import { getCategories, getLabels, getStyles } from "@/lib/harvest/catalog";
import type {
  CatalogCategory,
  SearchFilterGroup,
  SearchFilterGroupKey,
  SearchFilterItem,
} from "@/types";

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

export async function GET(request: NextRequest) {
  const id = requestId();
  try {
    const language = request.nextUrl.searchParams.get("language") === "en" ? "en" : "fr";
    const [categoryGroups, labels, styles] = await Promise.all([
      getCategories(language),
      getLabels(),
      getStyles(),
    ]);
    const groups: SearchFilterGroup[] = [
      {
        key: "labels",
        label: "Labels",
        selection: "include-only",
        total: labels.length,
        available: labels.length,
        items: labels.map((label) => ({ id: label.id, name: label.name })),
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
      {
        key: "styles",
        label: "Styles",
        selection: "include-exclude",
        total: styles.length,
        available: styles.length,
        items: styles.map((style) => ({ id: style.id, name: style.name })),
      },
    ];
    return NextResponse.json(
      { data: { groups }, meta: { requestId: id } },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
          "X-Request-ID": id,
        },
      },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
