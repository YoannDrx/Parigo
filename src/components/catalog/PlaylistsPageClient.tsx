"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Disc3, ListMusic, Music2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { PlaylistCard } from "@/components/features/PlaylistCard";
import { TrackRow } from "@/components/features/TrackRow";
import { Button } from "@/components/ui/Button";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { CatalogHero } from "@/components/catalog";
import { CatalogActiveFilters, type CatalogActiveFilter } from "@/components/catalog/CatalogActiveFilters";
import { CatalogFacetDropdown, type CatalogFacetOption } from "@/components/catalog/CatalogFacetDropdown";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Album, Playlist as CatalogPlaylist, Track, ViewMode } from "@/types";

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

interface PlaylistDiscoveryResponse {
  data: {
    playlistIds: string[];
    tracks: Track[];
    facets: Record<DiscoveryFilter, CatalogFacetOption[]>;
  };
  meta: {
    playlistTotal: number;
    trackTotal: number;
    page: number;
    pageSize: number;
  };
}

function albumFor(track: Track): Album {
  return {
    id: track.albumId,
    slug: track.albumSlug,
    title: track.albumTitle || "",
    code: track.albumCode || track.cdCode,
    cover: track.albumCover || "/images/placeholder-album.svg",
    label: track.albumLabel || "",
    labelSlug: track.albumLabelSlug,
    genres: track.genres,
    moods: track.moods,
    trackCount: 0,
  };
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
  const [kind, setKind] = useState<"playlists" | "tracks">(searchParams.get("kind") === "tracks" ? "tracks" : "playlists");
  const [view, setView] = useState<ViewMode>(searchParams.get("view") === "list" ? "list" : "grid");
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get("page")) || 1));
  const [moods, setMoods] = useState(csv(searchParams.get("moods") ?? searchParams.get("mood")));
  const [genres, setGenres] = useState(csv(searchParams.get("genres") ?? searchParams.get("genre")));
  const [instruments, setInstruments] = useState(csv(searchParams.get("instruments") ?? searchParams.get("instrument")));
  const [musicFor, setMusicFor] = useState(csv(searchParams.get("musicFor")));
  const [discovery, setDiscovery] = useState<PlaylistDiscoveryResponse | null>(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ kind, sort, page: String(page), limit: "30" });
    if (moods.length) params.set("moods", moods.join(","));
    if (genres.length) params.set("genres", genres.join(","));
    if (instruments.length) params.set("instruments", instruments.join(","));
    if (musicFor.length) params.set("musicFor", musicFor.join(","));
    void fetch(`/api/playlists/discovery?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Playlist discovery unavailable");
        return response.json() as Promise<PlaylistDiscoveryResponse>;
      })
      .then(setDiscovery)
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setDiscovery(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setDiscoveryLoading(false);
      });
    return () => controller.abort();
  }, [genres, instruments, kind, moods, musicFor, page, sort]);

  const filterSets = useMemo(() => discovery?.data.facets ?? ({
    moods: topTerms(playlists, "moods"),
    genres: topTerms(playlists, "genres"),
    instruments: topTerms(playlists, "instruments"),
    musicFor: topTerms(playlists, "musicFor"),
  }), [discovery?.data.facets, playlists]);
  const visible = useMemo(() => {
    const exactIds = discovery ? new Set(discovery.data.playlistIds) : null;
    return playlists
      .filter((playlist) => exactIds
        ? exactIds.has(playlist.id)
        : matchesFacet(playlist.moods, moods)
          && matchesFacet(playlist.genres, genres)
          && matchesFacet(playlist.instruments, instruments)
          && matchesFacet(playlist.musicFor, musicFor))
      .sort((left, right) => {
        const comparison = left.title.localeCompare(right.title, locale, { sensitivity: "base" });
        return sort === "title-desc" ? -comparison : comparison;
      });
  }, [discovery, genres, instruments, locale, moods, musicFor, playlists, sort]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (sort !== "title-asc") params.set("sort", sort);
    if (kind === "tracks") params.set("kind", "tracks");
    if (kind === "playlists" && view !== "grid") params.set("view", view);
    if (page > 1) params.set("page", String(page));
    if (moods.length) params.set("moods", moods.join(","));
    if (genres.length) params.set("genres", genres.join(","));
    if (instruments.length) params.set("instruments", instruments.join(","));
    if (musicFor.length) params.set("musicFor", musicFor.join(","));
    const next = params.toString();
    if (next !== searchParams.toString()) router.replace(`${pathname}${next ? `?${next}` : ""}`, { scroll: false });
  }, [genres, instruments, kind, moods, musicFor, page, pathname, router, searchParams, sort, view]);

  const updateFacet = (setter: (value: string[]) => void, value: string[]) => {
    setter(value);
    setPage(1);
  };

  const filterGroups: Array<{ key: string; label: string; values: string[]; setter: (value: string[]) => void; terms: CatalogFacetOption[] }> = [
    { key: "moods", label: locale === "fr" ? "Ambiance" : "Mood", values: moods, setter: (value) => updateFacet(setMoods, value), terms: filterSets.moods },
    { key: "genres", label: "Genre", values: genres, setter: (value) => updateFacet(setGenres, value), terms: filterSets.genres },
    { key: "instruments", label: locale === "fr" ? "Instrument" : "Instrument", values: instruments, setter: (value) => updateFacet(setInstruments, value), terms: filterSets.instruments },
    { key: "music-for", label: locale === "fr" ? "Musique pour" : "Music for", values: musicFor, setter: (value) => updateFacet(setMusicFor, value), terms: filterSets.musicFor },
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
    setPage(1);
  };
  const trackTotal = discovery?.meta.trackTotal ?? 0;
  const totalPages = Math.max(1, Math.ceil(trackTotal / 30));

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <CatalogHero title={t("catalog.playlistsTitle")} intro={t("catalog.playlistsIntro")} containerClassName="max-w-[1920px]" />
        <div className="mx-auto max-w-[1920px] px-[var(--space-page-gutter)] pb-[var(--space-section-y)] pt-[var(--space-page-hero-follow)]">
          <CatalogToolbar
            locale={locale}
            sort={sort}
            onSortChange={(value) => { setSort(value); setPage(1); }}
            sortOptions={[
              { value: "title-asc", label: "A–Z" },
              { value: "title-desc", label: "Z–A" },
            ]}
            view={view}
            onViewChange={setView}
            resultCount={kind === "tracks" ? trackTotal : discovery?.meta.playlistTotal ?? visible.length}
            viewControlVisibility={kind === "tracks" ? "hidden" : "all"}
            primaryControls={(
              <>
                <div className="search-view-toggle inline-flex w-fit shrink-0 border border-[var(--line-strong)] bg-[var(--background)] p-1" role="group" aria-label={locale === "fr" ? "Contenu des sélections" : "Selection content"}>
                  {(["playlists", "tracks"] as const).map((value) => {
                    const Icon = value === "playlists" ? Disc3 : Music2;
                    const label = value === "playlists" ? "Playlists" : locale === "fr" ? "Pistes" : "Tracks";
                    return <button key={value} type="button" aria-pressed={kind === value} onClick={() => { setKind(value); setPage(1); }} className={`inline-flex h-10 items-center gap-2 px-3 text-xs font-semibold transition ${kind === value ? "bg-[var(--foreground)] text-[var(--background)]" : "hover:bg-[var(--surface-soft)]"}`}><Icon size={15} />{label}</button>;
                  })}
                </div>
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
              </>
            )}
          >
            <CatalogActiveFilters locale={locale} filters={activeFilters} onReset={resetFilters} />
          </CatalogToolbar>

          {discoveryLoading && !discovery ? (
            <div className="grid min-h-72 place-items-center"><ParigoLoader size="page" label={t("common.loading")} /></div>
          ) : kind === "tracks" ? discovery?.data.tracks.length ? (
            <div className="search-results-ledger overflow-visible border border-[var(--line-strong)] bg-[var(--surface)]">
              {discovery.data.tracks.map((track, index) => <TrackRow key={track.id} track={track} album={albumFor(track)} queue={discovery.data.tracks} index={(page - 1) * 30 + index} displayNumber={String((page - 1) * 30 + index + 1)} showAlbumCover mobileLayout="dense" />)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center"><Music2 size={42} className="mb-6 opacity-30" /><h2 className="font-[var(--font-editorial)] text-5xl font-normal tracking-[-.05em]">{locale === "fr" ? "Aucune piste ne correspond à ces filtres." : "No tracks match these filters."}</h2></div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center"><ListMusic size={42} className="mb-6 opacity-30" /><h2 className="font-[var(--font-editorial)] text-5xl font-normal tracking-[-.05em]">{t("catalog.noPlaylists")}</h2></div>
          ) : view === "grid" ? (
            <div data-testid="playlist-grid" className="grid grid-cols-1 gap-x-[var(--space-grid-x)] gap-y-[var(--space-grid-y)] md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
          {kind === "tracks" && totalPages > 1 ? (
            <nav className="mt-7 flex items-center justify-between border-t border-[var(--line)] pt-5" aria-label={locale === "fr" ? "Pagination des pistes" : "Track pagination"}>
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={16} />{locale === "fr" ? "Précédent" : "Previous"}</Button>
              <span className="font-mono text-xs text-[var(--text-muted)]">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>{locale === "fr" ? "Suivant" : "Next"}<ChevronRight size={16} /></Button>
            </nav>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}
