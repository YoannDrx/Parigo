"use client";

import Image from "next/image";
import Link from "next/link";
import { ListMusic } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { PlaylistCard } from "@/components/features/PlaylistCard";
import { CatalogHero } from "@/components/catalog";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Playlist as CatalogPlaylist, ViewMode } from "@/types";

type PlaylistSort = "title-asc" | "title-desc" | "tracks-desc";
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

function topTerms(playlists: ApiPlaylist[], key: DiscoveryFilter, limit = 12): string[] {
  const counts = new Map<string, number>();
  playlists.forEach((playlist) => playlist[key]?.forEach((term) => counts.set(term, (counts.get(term) ?? 0) + 1)));
  return [...counts].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).slice(0, limit).map(([term]) => term);
}

export function PlaylistsPageClient({ playlists }: { playlists: ApiPlaylist[] }) {
  const { locale, t, localizedPath } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [sort, setSort] = useState<PlaylistSort>(
    searchParams.get("sort") === "title-desc" || searchParams.get("sort") === "tracks-desc"
      ? searchParams.get("sort") as PlaylistSort
      : "title-asc",
  );
  const [view, setView] = useState<ViewMode>(searchParams.get("view") === "list" ? "list" : "grid");
  const [mood, setMood] = useState(searchParams.get("mood") ?? "");
  const [genre, setGenre] = useState(searchParams.get("genre") ?? "");
  const [instrument, setInstrument] = useState(searchParams.get("instrument") ?? "");
  const [musicFor, setMusicFor] = useState(searchParams.get("musicFor") ?? "");
  const filterSets = useMemo(() => ({
    moods: topTerms(playlists, "moods"),
    genres: topTerms(playlists, "genres"),
    instruments: topTerms(playlists, "instruments"),
    musicFor: topTerms(playlists, "musicFor"),
  }), [playlists]);
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return playlists
      .filter((playlist) => !normalized || `${playlist.title} ${playlist.description ?? ""}`.toLocaleLowerCase(locale).includes(normalized))
      .filter((playlist) => !mood || playlist.moods?.includes(mood))
      .filter((playlist) => !genre || playlist.genres?.includes(genre))
      .filter((playlist) => !instrument || playlist.instruments?.includes(instrument))
      .filter((playlist) => !musicFor || playlist.musicFor?.includes(musicFor))
      .sort((left, right) => {
        if (sort === "tracks-desc") return right.trackCount - left.trackCount || left.title.localeCompare(right.title, locale);
        const comparison = left.title.localeCompare(right.title, locale, { sensitivity: "base" });
        return sort === "title-desc" ? -comparison : comparison;
      });
  }, [genre, instrument, locale, mood, musicFor, playlists, query, sort]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (sort !== "title-asc") params.set("sort", sort);
    if (view !== "grid") params.set("view", view);
    if (mood) params.set("mood", mood);
    if (genre) params.set("genre", genre);
    if (instrument) params.set("instrument", instrument);
    if (musicFor) params.set("musicFor", musicFor);
    const next = params.toString();
    if (next !== searchParams.toString()) router.replace(`${pathname}${next ? `?${next}` : ""}`, { scroll: false });
  }, [genre, instrument, mood, musicFor, pathname, query, router, searchParams, sort, view]);

  const filterGroups: Array<{ label: string; value: string; setter: (value: string) => void; terms: string[] }> = [
    { label: locale === "fr" ? "Ambiance" : "Mood", value: mood, setter: setMood, terms: filterSets.moods },
    { label: "Genre", value: genre, setter: setGenre, terms: filterSets.genres },
    { label: locale === "fr" ? "Instrument" : "Instrument", value: instrument, setter: setInstrument, terms: filterSets.instruments },
    { label: locale === "fr" ? "Musique pour" : "Music for", value: musicFor, setter: setMusicFor, terms: filterSets.musicFor },
  ];

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-32">
        <CatalogHero eyebrow={t("catalog.playlistsEyebrow")} title={t("catalog.playlistsTitle")} intro={t("catalog.playlistsIntro")} meta={`${playlists.length} ${t("common.playlists").toLowerCase()}`} />
        <div className="mx-auto max-w-[1700px] px-4 py-12 md:py-16 lg:px-8">
          <CatalogToolbar
            locale={locale}
            query={query}
            onQueryChange={setQuery}
            queryPlaceholder={locale === "fr" ? "Rechercher une playlist ou un thème" : "Search playlists and themes"}
            sort={sort}
            onSortChange={setSort}
            sortOptions={[
              { value: "title-asc", label: "A–Z" },
              { value: "title-desc", label: "Z–A" },
              { value: "tracks-desc", label: locale === "fr" ? "Plus de pistes" : "Most tracks" },
            ]}
            view={view}
            onViewChange={setView}
            resultCount={visible.length}
          >
            <div className="mt-4 grid gap-3 border-t border-[var(--line)] pt-4 md:grid-cols-2 xl:grid-cols-4">
              {filterGroups.map((group) => (
                <label key={group.label} className="grid gap-1.5 text-xs font-semibold">
                  <span>{group.label}</span>
                  <select value={group.value} onChange={(event) => group.setter(event.target.value)} className="h-11 border border-[var(--line)] bg-[var(--background)] px-3 text-sm font-normal">
                    <option value="">{locale === "fr" ? "Tous" : "All"}</option>
                    {group.terms.map((term) => <option key={term} value={term}>{term}</option>)}
                  </select>
                </label>
              ))}
            </div>
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
                <Link key={playlist.id} href={localizedPath(`/playlists/${playlist.slug || playlist.id}`)} className="group grid min-h-24 grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-[var(--line)] py-4 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:px-4">
                  <div className="relative aspect-square overflow-hidden border border-[var(--line)]"><Image src={playlist.cover || "/images/placeholder-album.svg"} alt="" fill sizes="96px" className="object-cover" /></div>
                  <div className="min-w-0"><h2 className="truncate text-xl font-semibold">{playlist.title}</h2><p className="mt-1 line-clamp-1 text-sm text-[var(--text-muted)]">{playlist.moods?.slice(0, 3).join(" · ") || playlist.description}</p></div>
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
