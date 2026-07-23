import type { Locale } from "@/i18n/messages";

export const locales = ["fr", "en"] as const;

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "fr" || value === "en";
}

export function localeFromPathname(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "fr";
}

export function stripLocalePrefix(pathname: string): string {
  if (pathname === "/en" || pathname === "/fr") return "/";
  if (pathname.startsWith("/en/") || pathname.startsWith("/fr/")) {
    return pathname.slice(3) || "/";
  }
  return pathname || "/";
}

export function localizedPath(locale: Locale, path: string): string {
  const [pathname, suffix = ""] = path.split(/([?#].*)/, 2);
  const normalized = stripLocalePrefix(pathname.startsWith("/") ? pathname : `/${pathname}`);
  return `${locale === "en" ? "/en" : ""}${normalized === "/" ? "" : normalized}${suffix}` || "/";
}

export function alternateLocalePath(pathname: string, locale: Locale): string {
  return localizedPath(locale === "fr" ? "en" : "fr", pathname);
}

export function safeInternalPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) return null;
  return value;
}
