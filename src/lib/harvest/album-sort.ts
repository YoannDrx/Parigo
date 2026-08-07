import type { Album } from "@/types";

function releaseTimestamp(album: Pick<Album, "releaseDate" | "year">): number | null {
  if (album.releaseDate) {
    const timestamp = Date.parse(album.releaseDate);
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return album.year ? Date.UTC(album.year, 0, 1) : null;
}

function catalogueNumber(code?: string): number {
  const value = code?.match(/\d+/)?.[0];
  return value ? Number(value) : -1;
}

export function compareAlbumsNewestFirst(
  left: Pick<Album, "releaseDate" | "year" | "code" | "title">,
  right: Pick<Album, "releaseDate" | "year" | "code" | "title">,
): number {
  const leftRelease = releaseTimestamp(left);
  const rightRelease = releaseTimestamp(right);
  if (leftRelease !== rightRelease) {
    if (leftRelease === null) return 1;
    if (rightRelease === null) return -1;
    return rightRelease - leftRelease;
  }

  const codeDifference = catalogueNumber(right.code) - catalogueNumber(left.code);
  return codeDifference || left.title.localeCompare(right.title, "fr", { sensitivity: "base" });
}
