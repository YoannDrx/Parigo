"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { CanonicalComposerSummary } from "@/lib/composers/profiles";
import type { Locale } from "@/i18n/messages";
import { localizedPath } from "@/lib/locale";
import { CatalogSearchField } from "@/components/search/CatalogSearchField";

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
  const router = useRouter();
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
      router.replace(next, { scroll: false });
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [pathname, query, router]);

  return (
    <>
      <CatalogSearchField
        id="composer-directory-search"
        value={query}
        onValueChange={setQuery}
        placeholder={locale === "fr" ? "Rechercher par nom…" : "Search by name…"}
        ariaLabel={locale === "fr" ? "Rechercher un compositeur" : "Search composers"}
        clearLabel={locale === "fr" ? "Effacer la recherche" : "Clear search"}
        className="mb-6 md:mb-10 md:max-w-2xl"
      />
      <p className="sr-only" role="status" aria-live="polite">
        {visibleCredits.length} {locale === "fr" ? "crédits affichés" : "credits shown"}
      </p>
      {visibleCredits.length > 0 ? (
        <div data-testid="composer-directory-results" className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
          {visibleCredits.map((profile) => {
            const crop = profile.cardCrop;
            const image = profile.detailImage?.src ?? profile.image;
            return (
            <Link
              key={profile.slug}
              href={localizedPath(locale, `/talents/${profile.slug}`)}
              className="composer-card group relative flex aspect-square flex-col justify-end overflow-hidden border border-[var(--signal)] bg-[var(--surface)] transition"
            >
              {crop?.fit === "contain" ? <Image src={image} alt="" fill sizes="(max-width: 640px) 100vw, 25vw" aria-hidden="true" className="scale-110 object-cover opacity-45 blur-xl" /> : null}
              <Image
                src={image}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                style={{
                  objectPosition: crop?.objectPosition,
                  transform: profile.slug === "2080" ? "scale(1.018)" : crop?.scale ? `scale(${crop.scale})` : undefined,
                  transformOrigin: profile.slug === "2080" ? "bottom left" : crop?.objectPosition,
                }}
                className={`${crop?.fit === "contain" ? "object-contain" : "object-cover"} grayscale transition duration-500 group-hover:grayscale-0`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="composer-card__caption relative p-5 text-white sm:p-6">
                <h2 className="break-words text-2xl font-semibold tracking-[-.04em] sm:text-3xl">{profile.name}</h2>
              </div>
            </Link>
            );
          })}
        </div>
      ) : (
        <p className="border-y border-[var(--line)] py-16 text-center text-[var(--text-muted)]">
          {locale === "fr" ? "Aucun compositeur ne correspond à cette recherche." : "No composer matches this search."}
        </p>
      )}
    </>
  );
}
