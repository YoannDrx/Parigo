import type { SearchFacets } from "@/types";
import { isRecord } from "./errors";
import { asNumber, asString, recordArray } from "./values";

export interface HarvestSearchInput {
  query?: string;
  view?: "Track" | "Album";
  skip?: number;
  limit?: number;
  sort?: string;
  labels?: string[];
  styles?: string[];
  categories?: string[];
  minBpm?: number;
  maxBpm?: number;
  minDuration?: number;
  maxDuration?: number;
  type?: "main" | "alternate" | "all";
  language?: "fr" | "en";
  regionId?: string;
  saveSearchHistory?: boolean;
  returnRates?: boolean;
}

export interface SignedSearchValues {
  include: string[];
  exclude: string[];
}

export function harvestCategoryId(value: string): string {
  const withoutPrefix = value.replace(/^ATT_/i, "");
  const opaqueId = withoutPrefix.split("_")[0];
  return `ATT_${opaqueId}`;
}

export function splitSignedValues(
  values: string[] | undefined,
  normalize: (value: string) => string = (value) => value,
): SignedSearchValues {
  const include = new Set<string>();
  const exclude = new Set<string>();
  for (const rawValue of values ?? []) {
    const negative = rawValue.startsWith("-");
    const rawId = negative ? rawValue.slice(1) : rawValue;
    const id = normalize(rawId.trim());
    if (!id) continue;
    (negative ? exclude : include).add(id);
  }
  return {
    include: [...include].sort(),
    exclude: [...exclude].sort(),
  };
}

export function buildCloudSearch(input: HarvestSearchInput): Record<string, unknown> {
  const type = input.type ?? "main";
  const bundle: Record<string, unknown> = {
    St_Keyword_Aggregated: {
      ExactPhrase: false,
      Wildcard: true,
      DisableKeywordGroup: false,
      OrOperation: false,
      Keywords: input.query?.trim() || "%",
      Negative: false,
    },
  };
  // Harvest expects comma-separated opaque IDs here. Arrays deserialize but fail
  // later as a logical Error inside the service, even though HTTP remains 200.
  const labels = splitSignedValues(input.labels).include;
  const styles = splitSignedValues(input.styles);
  const categories = splitSignedValues(input.categories, harvestCategoryId);
  if (labels.length) bundle.St_Library = { Libraries: labels.join(","), Negative: false };
  if (styles.include.length) {
    bundle.St_Style = { Styles: styles.include.join(","), OrOperation: false, Negative: false };
  }
  if (categories.include.length) {
    bundle.St_Category = { IDs: categories.include.join(","), Negative: false };
  }
  if (input.minBpm !== undefined || input.maxBpm !== undefined) {
    bundle.St_Bpm = { Start: String(input.minBpm ?? 1), End: String(Math.min(input.maxBpm ?? 300, 300)) };
  }
  if (input.minDuration !== undefined || input.maxDuration !== undefined) {
    bundle.St_Duration = {
      Start: String(input.minDuration ?? 1),
      End: String(input.maxDuration ?? 2029),
    };
  }

  const previousBundle: Record<string, unknown> = {};
  if (categories.exclude.length) {
    previousBundle.St_Category = { IDs: categories.exclude.join(","), Negative: true };
  }
  if (styles.exclude.length) {
    previousBundle.St_Style = { Styles: styles.exclude.join(","), OrOperation: false, Negative: true };
  }

  return {
    SaveSearchHistory: Boolean(input.saveSearchHistory),
    ...(input.regionId ? { RegionID: input.regionId } : {}),
    SearchFilters: {
      SearchType: "Normal",
      LibraryType: "",
      IncludeInactive: false,
      MainOnly: type === "main",
      AlternateOnly: type === "alternate",
      NearestBPM: false,
      NearestDuration: false,
      NearestAlternate: false,
      TranslateKeyword: input.language || "fr",
      ParentSearchHistoryID: "",
      ...(Object.keys(previousBundle).length ? { PreviousSearchTermBundles: [previousBundle] } : {}),
      SearchTermBundle: bundle,
      ResultView: {
        View: input.view ?? "Track",
        Sort_Predefined: input.sort || "RankExpression",
        RankExpression: "",
        Skip: String(input.skip ?? 0),
        Limit: String(input.limit ?? 30),
        ReturnRates: Boolean(input.returnRates),
        Facet_Library: true,
        Facet_Style: true,
        Facet_BPM: true,
        Facet_Duration: true,
        Facet_Category: true,
      },
    },
  };
}

export function mapSearchFacets(payload: unknown): SearchFacets {
  const source = isRecord(payload) && isRecord(payload.Facets) ? payload.Facets : {};
  const bpm = isRecord(source.BPM) ? source.BPM : {};
  const duration = isRecord(source.Duration) ? source.Duration : {};
  const mapItems = (key: string) =>
    recordArray(source, key).length
      ? recordArray(source, key).map((item) => ({
          id: asString(item.ID),
          name: asString(item.Name),
          count: asNumber(item.Count),
          parentId: asString(item.ParentID) || undefined,
        }))
      : isRecord(source[key])
        ? recordArray(source[key], "Items").map((item) => ({
            id: asString(item.ID),
            name: asString(item.Name),
            count: asNumber(item.Count),
            parentId: asString(item.ParentID) || undefined,
          }))
        : [];

  return {
    bpm: { min: Math.max(1, asNumber(bpm.Min, 1)), max: Math.min(300, asNumber(bpm.Max, 300)) },
    duration: { min: Math.max(1, asNumber(duration.Min, 1)), max: asNumber(duration.Max, 2029) },
    labels: mapItems("Libraries"),
    categories: mapItems("Categories"),
    styles: mapItems("Styles"),
  };
}
