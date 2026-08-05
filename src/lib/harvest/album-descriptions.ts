import type { Album } from "@/types";

export type AlbumDescriptionLocale = "fr" | "en";

export function resolveAlbumDescription(
  album: Pick<Album, "description" | "descriptions">,
  locale: AlbumDescriptionLocale,
): string | undefined {
  return album.descriptions?.[locale]?.trim()
    || album.descriptions?.en?.trim()
    || album.description?.trim()
    || undefined;
}
