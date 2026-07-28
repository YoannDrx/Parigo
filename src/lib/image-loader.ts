import type { ImageLoaderProps } from "next/image";

const HARVEST_IMAGE_ORIGIN = "https://d3vy0pmxxxelni.cloudfront.net";
const LOCAL_URL_ORIGIN = "https://parigo.invalid";
const MAX_HARVEST_IMAGE_WIDTH = 800;

function positiveInteger(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function resizeHarvestUrl(url: URL, width: number): string {
  const sourceWidth = positiveInteger(url.searchParams.get("width"));
  const sourceHeight = positiveInteger(url.searchParams.get("height"));
  const targetWidth = Math.min(width, sourceWidth ?? MAX_HARVEST_IMAGE_WIDTH, MAX_HARVEST_IMAGE_WIDTH);
  const targetHeight = sourceWidth && sourceHeight
    ? Math.max(1, Math.round(sourceHeight * targetWidth / sourceWidth))
    : targetWidth;

  url.searchParams.set("width", String(targetWidth));
  url.searchParams.set("height", String(targetHeight));
  return url.href;
}

export function resizeArtworkSource(src: string, width: number): string {
  const url = new URL(src, LOCAL_URL_ORIGIN);
  return url.origin === HARVEST_IMAGE_ORIGIN
    ? resizeHarvestUrl(url, width)
    : src;
}

export default function parigoImageLoader({ src, width }: ImageLoaderProps): string {
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;

  const absolute = URL.canParse(src);
  const url = new URL(src, LOCAL_URL_ORIGIN);

  if (url.origin === HARVEST_IMAGE_ORIGIN) {
    return resizeHarvestUrl(url, width);
  }

  // Keep local assets and third-party thumbnails direct while making the
  // requested width visible to Next.js' custom-loader validation. Origins that
  // do not transform on this hint simply ignore the query parameter.
  url.searchParams.set("parigo-width", String(width));
  return absolute ? url.href : `${url.pathname}${url.search}${url.hash}`;
}
