"use client";

import { Search, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { HarvestComposerCredit } from "@/lib/harvest/composer-credits";
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
  credits,
  initialQuery,
  locale,
  pathname,
}: {
  credits: HarvestComposerCredit[];
  initialQuery: string;
  locale: Locale;
  pathname: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const visibleCredits = useMemo(() => {
    const normalized = normalizeSearchValue(deferredQuery, locale);
    if (!normalized) return credits;
    return credits.filter((credit) => normalizeSearchValue(credit.name, locale).includes(normalized));
  }, [credits, deferredQuery, locale]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const normalized = query.trim();
      if (normalized) params.set("q", normalized);
      else params.delete("q");
      const next = `${pathname}${params.size ? `?${params.toString()}` : ""}${window.location.hash}`;
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
        <div data-testid="composer-directory-results" className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
          {visibleCredits.map((credit) => (
            <Link
              key={credit.id}
              href={localizedPath(locale, `/compositeurs/${credit.id}`)}
              className="composer-card group relative flex min-h-64 flex-col justify-between overflow-hidden border border-[var(--line)] bg-[var(--surface)] p-5 transition hover:border-[var(--line-strong)] hover:bg-[var(--surface-soft)] sm:p-6"
            >
              <div>
                <p className="font-mono text-[.54rem] uppercase tracking-[.14em] text-[var(--signal-strong)]">
                  {locale === "fr" ? "Crédit Harvest exact" : "Exact Harvest credit"}
                </p>
                <h2 className="mt-5 break-words text-2xl font-semibold tracking-[-.04em] sm:text-3xl">{credit.name}</h2>
              </div>
              <div className="mt-8 border-t border-[var(--line)] pt-4">
                <p className="font-mono text-[.62rem] text-[var(--text-muted)]">
                  {credit.trackCount} {locale === "fr" ? "pistes" : "tracks"} · {credit.albumIds.length} albums
                </p>
                {credit.albumCodes.length > 0 && <p className="mt-2 line-clamp-2 text-xs text-[var(--text-muted)]">{credit.albumCodes.join(" · ")}</p>}
              </div>
              <span aria-hidden="true" className="composer-card__corner composer-card__corner--top" />
              <span aria-hidden="true" className="composer-card__corner composer-card__corner--bottom" />
            </Link>
          ))}
        </div>
      ) : (
        <p className="border-y border-[var(--line)] py-16 text-center text-[var(--text-muted)]">
          {locale === "fr" ? "Aucun crédit Harvest ne correspond à cette recherche." : "No Harvest credit matches this search."}
        </p>
      )}
    </>
  );
}
