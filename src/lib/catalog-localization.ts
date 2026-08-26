import type { Label, Playlist } from "@/types";

export type CatalogLocale = "fr" | "en";

export function resolveLocalizedValue(
  values: Partial<Record<CatalogLocale, string>> | undefined,
  fallback: string | null | undefined,
  locale: CatalogLocale,
): string | undefined {
  return values?.[locale]?.trim()
    || values?.en?.trim()
    || fallback?.trim()
    || undefined;
}

export function localizeLabel<T extends Label>(label: T, locale: CatalogLocale): T {
  return {
    ...label,
    description: resolveLocalizedValue(label.descriptions, label.description, locale),
  } as T;
}

export function localizePlaylist<T extends Playlist>(playlist: T, locale: CatalogLocale): T {
  return {
    ...playlist,
    title: resolveLocalizedValue(playlist.titles, playlist.title, locale) || playlist.title,
    description: resolveLocalizedValue(playlist.descriptions, playlist.description, locale),
  } as T;
}
