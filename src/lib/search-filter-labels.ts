import type { SearchFilterGroupKey, SearchFilterItem } from "@/types";

const FILTER_GROUP_LABELS: Record<SearchFilterGroupKey, {
  singular: { fr: string; en: string };
  plural: { fr: string; en: string };
}> = {
  labels: { singular: { fr: "Label", en: "Label" }, plural: { fr: "Labels", en: "Labels" } },
  composers: { singular: { fr: "Compositeur", en: "Composer" }, plural: { fr: "Compositeurs", en: "Composers" } },
  styles: { singular: { fr: "Style", en: "Style" }, plural: { fr: "Styles", en: "Styles" } },
  genre: { singular: { fr: "Genre", en: "Genre" }, plural: { fr: "Genres", en: "Genres" } },
  moods: { singular: { fr: "Ambiance", en: "Mood" }, plural: { fr: "Ambiances", en: "Moods" } },
  musicFor: { singular: { fr: "Usage", en: "Music for" }, plural: { fr: "Usages", en: "Music for" } },
  period: { singular: { fr: "Époque", en: "Period" }, plural: { fr: "Époques", en: "Periods" } },
  instruments: { singular: { fr: "Instrument", en: "Instrument" }, plural: { fr: "Instruments", en: "Instruments" } },
  area: { singular: { fr: "Zone", en: "Area" }, plural: { fr: "Zones", en: "Areas" } },
};

export function searchFilterGroupLabel(
  key: SearchFilterGroupKey,
  locale: "fr" | "en",
  form: "singular" | "plural" = "singular",
): string {
  return FILTER_GROUP_LABELS[key][form][locale];
}

export function canonicalSearchFilterName(item: SearchFilterItem): string {
  return item.canonicalName || item.name;
}

export function displaySearchFilterName(
  _key: SearchFilterGroupKey,
  item: SearchFilterItem,
  locale: "fr" | "en",
): string {
  void _key;
  return locale === "fr"
    ? item.localizedName?.trim() || item.name || canonicalSearchFilterName(item)
    : canonicalSearchFilterName(item);
}

function explanatorySearchFilterName(
  key: SearchFilterGroupKey,
  item: SearchFilterItem,
  locale: "fr" | "en",
): string {
  const canonical = canonicalSearchFilterName(item);
  const localized = item.localizedName?.trim();
  if (locale !== "fr" || !localized || localized.toLocaleLowerCase("fr") === canonical.toLocaleLowerCase("en")) {
    return canonical;
  }
  return `${localized} (${canonical})`;
}

export function searchFilterLabel(
  key: SearchFilterGroupKey,
  item: SearchFilterItem,
  locale: "fr" | "en",
): string {
  return `${searchFilterGroupLabel(key, locale)} · ${explanatorySearchFilterName(key, item, locale)}`;
}

export function canonicalSearchFilterLabel(
  key: SearchFilterGroupKey,
  item: SearchFilterItem,
  locale: "fr" | "en",
): string {
  return `${searchFilterGroupLabel(key, locale)} · ${displaySearchFilterName(key, item, locale)}`;
}
