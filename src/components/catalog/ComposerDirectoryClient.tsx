"use client";

import { Search, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ComposerCard } from "@/components/editorial/ComposerCard";
import type { ComposerProfile } from "@/lib/editorial/contracts";
import type { Locale } from "@/i18n/messages";

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
  profiles: ComposerProfile[];
  initialQuery: string;
  locale: Locale;
  pathname: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const visibleProfiles = useMemo(() => {
    const normalized = normalizeSearchValue(deferredQuery, locale);
    if (!normalized) return profiles;
    return profiles.filter((profile) => normalizeSearchValue(profile.name, locale).includes(normalized));
  }, [deferredQuery, locale, profiles]);

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
      <div className="catalog-search-frame search-query-frame mb-8 flex min-h-14 items-center border border-[var(--line-strong)] bg-[var(--surface)] px-4 focus-within:border-[var(--signal-strong)] focus-within:ring-2 focus-within:ring-[var(--signal)]/20 md:mb-10 md:max-w-2xl">
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
        {visibleProfiles.length} {locale === "fr" ? "profils affichés" : "profiles shown"}
      </p>
      {visibleProfiles.length > 0 ? (
        <div data-testid="composer-directory-results" className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
          {visibleProfiles.map((profile) => <ComposerCard key={profile.slug} profile={profile} locale={locale} />)}
        </div>
      ) : (
        <p className="border-y border-[var(--line)] py-16 text-center text-[var(--text-muted)]">
          {locale === "fr" ? "Aucun profil ne correspond à cette recherche." : "No profile matches this search."}
        </p>
      )}
    </>
  );
}
