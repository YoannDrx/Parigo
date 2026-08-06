"use client";

import { Search, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { CanonicalComposerSummary } from "@/lib/composers/profiles";
import type { Locale } from "@/i18n/messages";
import { localizedPath } from "@/lib/locale";

function normalizeSearchValue(value: string, locale: Locale) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase(locale)
    .trim();
}

export function ComposerDirectoryClient({
  profiles,
  initialQuery,
  locale,
  pathname,
}: {
  profiles: CanonicalComposerSummary[];
  initialQuery: string;
  locale: Locale;
  pathname: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const visibleCredits = useMemo(() => {
    const normalized = normalizeSearchValue(deferredQuery, locale);
    if (!normalized) return profiles;
    return profiles.filter((profile) => normalizeSearchValue(profile.name, locale).includes(normalized));
  }, [profiles, deferredQuery, locale]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const normalized = query.trim();
      if (normalized) params.set("q", normalized);
      else params.delete("q");
      const next = `${pathname}${params.size ? `?${params.toString()}` : ""}${window.location.hash}`;
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (current === next) return;
      window.history.replaceState(null, "", next);
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [pathname, query]);

  return (
    <>
      <div className="composer-directory-search catalog-search-frame search-query-frame mb-8 flex min-h-14 items-center border border-[var(--line-strong)] bg-[var(--surface)] px-4 md:mb-10 md:max-w-2xl">
        <Search aria-hidden="true" size={18} className="mr-3 shrink-0 text-[var(--signal-strong)]" />
        <label htmlFor="composer-directory-search" className="sr-only">
          {locale === "fr" ? "Rechercher un compositeur" : "Search composers"}
        </label>
        <input
          id="composer-directory-search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={locale === "fr" ? "Rechercher par nom…" : "Search by name…"}
          className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="grid h-11 w-11 shrink-0 place-items-center text-[var(--text-muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
            aria-label={locale === "fr" ? "Effacer la recherche" : "Clear search"}
          >
            <X size={17} />
          </button>
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {visibleCredits.length} {locale === "fr" ? "crédits affichés" : "credits shown"}
      </p>
      {visibleCredits.length > 0 ? (
        <div data-testid="composer-directory-results" className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
          {visibleCredits.map((profile) => (
            <Link
              key={profile.slug}
              href={localizedPath(locale, `/compositeurs/${profile.slug}`)}
              className="composer-card group relative flex min-h-72 flex-col justify-end overflow-hidden border border-[var(--line)] bg-[var(--surface)] transition hover:border-[var(--line-strong)] sm:min-h-80"
            >
              <Image
                src={profile.image}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                className="object-cover grayscale transition duration-500 group-hover:scale-[1.025] group-hover:grayscale-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="relative p-5 text-white sm:p-6">
                <h2 className="break-words text-2xl font-semibold tracking-[-.04em] sm:text-3xl">{profile.name}</h2>
              </div>
              <span aria-hidden="true" className="composer-card__corner composer-card__corner--top" />
              <span aria-hidden="true" className="composer-card__corner composer-card__corner--bottom" />
            </Link>
          ))}
        </div>
      ) : (
        <p className="border-y border-[var(--line)] py-16 text-center text-[var(--text-muted)]">
          {locale === "fr" ? "Aucun compositeur ne correspond à cette recherche." : "No composer matches this search."}
        </p>
      )}
    </>
  );
}
