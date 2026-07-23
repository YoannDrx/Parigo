import type { Metadata } from "next";
import type { Locale } from "@/i18n/messages";
import { localizedPath } from "./locale";

const DEFAULT_SITE_URL = "https://parigo-ten.vercel.app";

function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL;
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an absolute HTTPS URL.");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a public HTTPS origin without credentials, query or hash.");
  }
  return url.origin;
}

export const SITE_URL = resolveSiteUrl();

if (process.env.VERCEL_ENV === "production" && !process.env.NEXT_PUBLIC_SITE_URL) {
  throw new Error("NEXT_PUBLIC_SITE_URL is required in production.");
}

export const siteConfig = {
  name: "Parigo Music",
  url: SITE_URL,
  email: "info@parigomusic.com",
  descriptions: {
    fr: "Bibliothèque de musique de production pour le cinéma, la télévision, la publicité et tous les récits en images.",
    en: "Production music library for film, television, advertising and every kind of visual storytelling.",
  },
  ogImage: "/images/parigo-og.jpg",
} as const;

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

export function truncateDescription(value: string, max = 158): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  const candidate = normalized.slice(0, max + 1);
  const boundary = candidate.lastIndexOf(" ");
  return `${candidate.slice(0, boundary > 100 ? boundary : max).replace(/[.,;:!?-]+$/, "")}…`;
}

interface BuildMetadataOptions {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  image?: string | null;
  type?: "website" | "article";
  index?: boolean;
  follow?: boolean;
  alternatePaths?: Partial<Record<Locale, string>>;
}

export function buildMetadata({
  locale,
  path,
  title,
  description,
  image,
  type = "website",
  index = true,
  follow = true,
  alternatePaths,
}: BuildMetadataOptions): Metadata {
  const basePath = path.split(/[?#]/, 1)[0] || "/";
  const frPath = alternatePaths?.fr || localizedPath("fr", basePath);
  const enPath = alternatePaths?.en || localizedPath("en", basePath);
  const canonical = localizedPath(locale, basePath);
  const localizedDescription = truncateDescription(description);
  const resolvedImage = absoluteUrl(image || siteConfig.ogImage);

  return {
    title,
    description: localizedDescription,
    robots: { index, follow },
    alternates: {
      canonical: absoluteUrl(canonical),
      languages: {
        fr: absoluteUrl(frPath),
        en: absoluteUrl(enPath),
        "x-default": absoluteUrl(frPath),
      },
    },
    openGraph: {
      type,
      url: absoluteUrl(canonical),
      siteName: siteConfig.name,
      locale: locale === "fr" ? "fr_FR" : "en_GB",
      alternateLocale: locale === "fr" ? ["en_GB"] : ["fr_FR"],
      title,
      description: localizedDescription,
      images: [{ url: resolvedImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: localizedDescription,
      images: [resolvedImage],
    },
  };
}

export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
