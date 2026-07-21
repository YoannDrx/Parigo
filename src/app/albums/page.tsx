"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Grid3X3, List, SlidersHorizontal, Loader2 } from "lucide-react";
import { Header, Footer } from "@/components/layout";
import { Button, Select, Tag } from "@/components/ui";
import { AlbumCard } from "@/components/features";
import { useAlbums, useLabels, useGenres } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/types";
import { useI18n } from "@/components/providers/I18nProvider";
import { CatalogHero } from "@/components/catalog";
import { localizeCatalogTerm } from "@/i18n/catalog-terms";

export default function AlbumsPage() {
  const { locale, t } = useI18n();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<"title-asc" | "title-desc">("title-asc");

  // Fetch data from API
  const { data: albumsData, isLoading: albumsLoading } = useAlbums({
    limit: 50,
    label: selectedLabel || undefined,
    categories: selectedGenre ? [selectedGenre] : undefined,
  });
  const { data: labelsData } = useLabels({ limit: 20 });
  const { data: genresData } = useGenres();

  const albums = albumsData?.albums ?? [];
  const labels = labelsData?.labels ?? [];
  const genres = genresData?.genres ?? [];
  const sortedAlbums = useMemo(() => [...(albumsData?.albums ?? [])].sort((left, right) => {
    const comparison = left.title.localeCompare(right.title, locale, { sensitivity: "base" });
    return sort === "title-asc" ? comparison : -comparison;
  }), [albumsData?.albums, locale, sort]);

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <CatalogHero eyebrow={t("catalog.albumsEyebrow")} title={t("catalog.albumsTitle")} intro={t("catalog.albumsIntro")} meta={`${albumsData?.pagination.total ?? 0} ${t("common.albums").toLowerCase()}`} />
        <div className="mx-auto max-w-[1700px] px-4 py-10 sm:px-6 lg:px-8 md:py-16">
          {/* Page Header */}
          <div className="mb-10 flex flex-col justify-end gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              {/* Filter Toggle (Mobile) */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden gap-2"
              >
                <SlidersHorizontal size={16} />
                {t("search.filters")}
              </Button>

              <Select value={sort} onValueChange={setSort} ariaLabel={locale === "fr" ? "Trier les albums" : "Sort albums"} className="min-w-28" options={[{ value: "title-asc", label: "A–Z" }, { value: "title-desc", label: "Z–A" }]} />

              {/* View Toggle */}
              <div className="flex overflow-hidden rounded-full border border-[var(--line)]">
                <button
                  onClick={() => setViewMode("grid")}
                  aria-label={locale === "fr" ? "Vue grille" : "Grid view"}
                  className={cn(
                    "p-2 transition-colors",
                    viewMode === "grid"
                      ? "bg-[var(--foreground)] text-[var(--background)]"
                      : "hover:bg-[var(--surface-soft)]"
                  )}
                >
                  <Grid3X3 size={18} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  aria-label={locale === "fr" ? "Vue liste" : "List view"}
                  className={cn(
                    "border-l border-[var(--line)] p-2 transition-colors",
                    viewMode === "list"
                      ? "bg-[var(--foreground)] text-[var(--background)]"
                      : "hover:bg-[var(--surface-soft)]"
                  )}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div
            className={cn(
              "mb-8 space-y-4",
              showFilters ? "block" : "hidden md:block"
            )}
          >
            {/* Labels */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
                Labels
              </h3>
              <div className="flex flex-wrap gap-2">
                <Tag
                  variant={selectedLabel === null ? "primary" : "default"}
                  clickable
                  onClick={() => setSelectedLabel(null)}
                >
                  {locale === "fr" ? "Tous" : "All"}
                </Tag>
                {labels.map((label) => (
                  <Tag
                    key={label.id}
                    variant={selectedLabel === label.id ? "primary" : "default"}
                    clickable
                    onClick={() => setSelectedLabel(label.id)}
                  >
                    {label.name}
                  </Tag>
                ))}
              </div>
            </div>

            {/* Genres */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
                Genres
              </h3>
              <div className="flex flex-wrap gap-2">
                <Tag
                  variant={selectedGenre === null ? "primary" : "default"}
                  clickable
                  onClick={() => setSelectedGenre(null)}
                >
                  {locale === "fr" ? "Tous" : "All"}
                </Tag>
                {genres.slice(0, 12).map((genre) => (
                  <Tag
                    key={genre.id}
                    variant={selectedGenre === genre.id ? "genre" : "default"}
                    clickable
                    onClick={() => setSelectedGenre(genre.id)}
                  >
                    {genre.name}
                  </Tag>
                ))}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {albumsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : (
            <>
              {/* Albums Grid */}
              <div
                className={cn(
                  viewMode === "grid"
                    ? "grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5"
                    : "border-y border-[var(--line)]"
                )}
              >
                {sortedAlbums.map((album, index) => (
                  <motion.div
                    key={album.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.035, 0.28) }}
                  >
                    {viewMode === "grid" ? <AlbumCard album={album} /> : (
                      <Link href={`/albums/${album.slug || album.id}`} className="group grid min-h-28 grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-[var(--line)] py-4 last:border-b-0 transition-colors hover:bg-[var(--surface-soft)] sm:min-h-32 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:gap-6 sm:px-4">
                        <div className="relative aspect-square overflow-hidden rounded-[.35rem] border border-[var(--line)] bg-[var(--surface)]">
                          <Image src={album.cover} alt={album.title} fill sizes="96px" className="object-cover transition-transform duration-500 group-hover:scale-[1.025]" />
                        </div>
                        <div className="min-w-0 py-1">
                          <p className="truncate font-mono text-[.56rem] uppercase tracking-[.13em] text-[var(--text-muted)]">{String(index + 1).padStart(2, "0")} · {album.label}</p>
                          <h2 className="mt-2 truncate text-lg font-semibold leading-tight tracking-[-.025em] text-[var(--foreground)] sm:text-2xl">{album.title}</h2>
                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[.56rem] uppercase tracking-[.1em] text-[var(--text-muted)]">
                            {album.genres[0] && <span>{localizeCatalogTerm(album.genres[0], locale)}</span>}
                            {(album.year || album.releaseDate) && <span>{album.year || new Date(album.releaseDate as string).getFullYear()}</span>}
                            {album.code && <span>{album.code}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 pl-2 sm:gap-5">
                          <span className="hidden whitespace-nowrap font-mono text-[.58rem] uppercase tracking-[.1em] text-[var(--text-muted)] sm:block">{album.trackCount} {t("catalog.tracks")}</span>
                          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] text-[var(--foreground)] transition duration-300 group-hover:border-[var(--signal-strong)] group-hover:bg-[var(--signal-strong)] group-hover:text-white"><ArrowUpRight size={16} /></span>
                        </div>
                      </Link>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Empty State */}
              {albums.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-[var(--color-gray-600)] text-lg mb-4">
                    {t("catalog.noAlbums")}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedLabel(null);
                      setSelectedGenre(null);
                    }}
                  >
                    {t("common.reset")}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
