"use client";

import Image from "next/image";
import Link from "next/link";
import { ListMusic } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { PlaylistCard } from "@/components/features/PlaylistCard";
import { CatalogHero } from "@/components/catalog";
import { CatalogActiveFilters, type CatalogActiveFilter } from "@/components/catalog/CatalogActiveFilters";
import { CatalogFacetDropdown, type CatalogFacetOption } from "@/components/catalog/CatalogFacetDropdown";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Playlist as CatalogPlaylist, ViewMode } from "@/types";

type PlaylistSort = "title-asc" | "title-desc";
type DiscoveryFilter = "moods" | "genres" | "instruments" | "musicFor";

interface ApiPlaylist {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover: string | null;
  trackCount: number;
  category: string | null;
  isFeatured: boolean;
  genres?: string[];
  moods?: string[];
  instruments?: string[];
  musicFor?: string[];
}

function topTerms(playlists: ApiPlaylist[], key: DiscoveryFilter, limit = 18): CatalogFacetOption[] {
  const counts = new Map<string, number>();
  playlists.forEach((playlist) => playlist[key]?.forEach((term) => counts.set(term, (counts.get(term) ?? 0) + 1)));
  return [...counts]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([term, count]) => ({ value: term, label: term, count }));
}

function csv(value: string | null) {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}

function unsigned(value: string) {
  return value.startsWith("-") ? value.slice(1) : value;
}

function matchesFacet(terms: string[] | undefined, values: string[]) {
  const included = values.filter((value) => !value.startsWith("-"));
  const excluded = values.filter((value) => value.startsWith("-")).map(unsigned);
  const available = terms ?? [];
  return (!included.length || included.some((value) => available.includes(value)))
    && !excluded.some((value) => available.includes(value));
}

export function PlaylistsPageClient({ playlists }: { playlists: ApiPlaylist[] }) {
  const { locale, t, localizedPath } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sort, setSort] = useState<PlaylistSort>(
    searchParams.get("sort") === "title-desc" ? "title-desc" : "title-asc",
  );
  const [view, setView] = useState<ViewMode>(searchParams.get("view") === "list" ? "list" : "grid");
  const [moods, setMoods] = useState(csv(searchParams.get("moods") ?? searchParams.get("mood")));
  const [genres, setGenres] = useState(csv(searchParams.get("genres") ?? searchParams.get("genre")));
  const [instruments, setInstruments] = useState(csv(searchParams.get("instruments") ?? searchParams.get("instrument")));
  const [musicFor, setMusicFor] = useState(csv(searchParams.get("musicFor")));
  const filterSets = useMemo(() => ({
    moods: topTerms(playlists, "moods"),
    genres: topTerms(playlists, "genres"),
    instruments: topTerms(playlists, "instruments"),
    musicFor: topTerms(playlists, "musicFor"),
  }), [playlists]);
  const visible = useMemo(() => {
    return playlists
      .filter((playlist) => matchesFacet(playlist.moods, moods))
      .filter((playlist) => matchesFacet(playlist.genres, genres))
      .filter((playlist) => matchesFacet(playlist.instruments, instruments))
      .filter((playlist) => matchesFacet(playlist.musicFor, musicFor))
      .sort((left, right) => {
        const comparison = left.title.localeCompare(right.title, locale, { sensitivity: "base" });
        return sort === "title-desc" ? -comparison : comparison;
      });
  }, [genres, instruments, locale, moods, musicFor, playlists, sort]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (sort !== "title-asc") params.set("sort", sort);
    if (view !== "grid") params.set("view", view);
    if (moods.length) params.set("moods", moods.join(","));
    if (genres.length) params.set("genres", genres.join(","));
    if (instruments.length) params.set("instruments", instruments.join(","));
    if (musicFor.length) params.set("musicFor", musicFor.join(","));
    const next = params.toString();
    if (next !== searchParams.toString()) router.replace(`${pathname}${next ? `?${next}` : ""}`, { scroll: false });
  }, [genres, instruments, moods, musicFor, pathname, router, searchParams, sort, view]);

  const filterGroups: Array<{ key: string; label: string; values: string[]; setter: (value: string[]) => void; terms: CatalogFacetOption[] }> = [
    { key: "moods", label: locale === "fr" ? "Ambiance" : "Mood", values: moods, setter: setMoods, terms: filterSets.moods },
    { key: "genres", label: "Genre", values: genres, setter: setGenres, terms: filterSets.genres },
    { key: "instruments", label: locale === "fr" ? "Instrument" : "Instrument", values: instruments, setter: setInstruments, terms: filterSets.instruments },
    { key: "music-for", label: locale === "fr" ? "Musique pour" : "Music for", values: musicFor, setter: setMusicFor, terms: filterSets.musicFor },
  ];
  const activeFilters: CatalogActiveFilter[] = filterGroups.flatMap((group) => group.values.map((value) => ({
    id: `${group.key}-${value}`,
    label: unsigned(value),
    group: group.label,
    state: value.startsWith("-") ? "exclude" as const : "include" as const,
    onRemove: () => group.setter(group.values.filter((item) => item !== value)),
  })));
  const resetFilters = () => {
    setMoods([]);
    setGenres([]);
    setInstruments([]);
    setMusicFor([]);
  };

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-32">
        <CatalogHero title={t("catalog.playlistsTitle")} intro={t("catalog.playlistsIntro")} meta={`${playlists.length} ${t("common.playlists").toLowerCase()}`} />
        <div className="mx-auto max-w-[1920px] px-3 py-4 sm:px-4 md:py-6">
          <CatalogToolbar
            locale={locale}
            sort={sort}
            onSortChange={setSort}
            sortOptions={[
              { value: "title-asc", label: "A–Z" },
              { value: "title-desc", label: "Z–A" },
            ]}
            view={view}
            onViewChange={setView}
            resultCount={visible.length}
            primaryControls={(
              <div data-testid="playlist-filters" className="grid min-w-0 flex-[1_1_40rem] grid-cols-2 gap-2 xl:grid-cols-4">
                {filterGroups.map((group) => (
                  <CatalogFacetDropdown
                    key={group.key}
                    label={group.label}
                    options={group.terms}
                    values={group.values}
                    locale={locale}
                    onValuesChange={group.setter}
                  />
                ))}
              </div>
            )}
          >
            <CatalogActiveFilters locale={locale} filters={activeFilters} onReset={resetFilters} />
          </CatalogToolbar>

          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center"><ListMusic size={42} className="mb-6 opacity-30" /><h2 className="font-[var(--font-editorial)] text-5xl font-normal tracking-[-.05em]">{t("catalog.noPlaylists")}</h2></div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-14 sm:grid-cols-3 md:gap-x-7 md:gap-y-20 lg:grid-cols-4 xl:grid-cols-5">
              {visible.map((playlist, index) => {
                const item: CatalogPlaylist = { ...playlist, id: playlist.slug || playlist.id, description: playlist.description ?? undefined, cover: playlist.cover || "/images/placeholder-album.svg", category: undefined };
                return <PlaylistCard key={playlist.id} playlist={item} priority={index < 2} />;
              })}
            </div>
          ) : (
            <div className="border-t border-[var(--line)]">
              {visible.map((playlist) => (
                <Link key={playlist.id} href={localizedPath(`/playlists/${playlist.slug || playlist.id}`)} className="catalog-list-row group grid min-h-24 grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-[var(--line)] py-4 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:px-4">
                  <div className="relative aspect-square overflow-hidden border border-[var(--line)]"><Image src={playlist.cover || "/images/placeholder-album.svg"} alt="" fill sizes="96px" className="object-cover" /></div>
                  <div className="min-w-0"><h2 className="catalog-list-row__title truncate text-xl font-semibold">{playlist.title}</h2><p className="mt-1 line-clamp-1 text-sm text-[var(--text-muted)]">{playlist.moods?.slice(0, 3).join(" · ") || playlist.description}</p></div>
                  <span className="pr-2 font-mono text-xs text-[var(--text-muted)]">{playlist.trackCount} {t("catalog.tracks")}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
