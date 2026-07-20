"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Grid3X3, List, SlidersHorizontal, Loader2 } from "lucide-react";
import { Header, Footer } from "@/components/layout";
import { Button, Tag } from "@/components/ui";
import { AlbumCard, MiniPlayer } from "@/components/features";
import { useAlbums, useLabels, useGenres } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import type { ViewMode, Album } from "@/types";
import { useI18n } from "@/components/providers/I18nProvider";
import { CatalogHero } from "@/components/catalog";

// Transform API album to component format
function transformAlbum(apiAlbum: {
  id: string;
  slug?: string;
  title: string;
  cover: string;
  label: string;
  labelSlug?: string;
  trackCount: number;
  genres: Array<{ name: string; slug: string; color?: string }>;
}): Album {
  return {
    id: apiAlbum.slug || apiAlbum.id,
    slug: apiAlbum.slug,
    title: apiAlbum.title,
    cover: apiAlbum.cover,
    label: apiAlbum.label,
    labelSlug: apiAlbum.labelSlug,
    trackCount: apiAlbum.trackCount,
    genres: apiAlbum.genres.map((g) => g.name),
  };
}

export default function AlbumsPage() {
  const { locale, t } = useI18n();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch data from API
  const { data: albumsData, isLoading: albumsLoading } = useAlbums({
    limit: 50,
    label: selectedLabel || undefined,
    genre: selectedGenre || undefined,
  });
  const { data: labelsData } = useLabels({ limit: 20 });
  const { data: genresData } = useGenres();

  const albums = albumsData?.albums.map(transformAlbum) ?? [];
  const labels = labelsData?.labels ?? [];
  const genres = genresData?.genres ?? [];

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
              <h3 className="text-sm font-semibold text-[var(--color-black)] mb-3">
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
                    variant={selectedLabel === label.slug ? "primary" : "default"}
                    clickable
                    onClick={() => setSelectedLabel(label.slug || null)}
                  >
                    {label.name}
                  </Tag>
                ))}
              </div>
            </div>

            {/* Genres */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-black)] mb-3">
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
                    variant={selectedGenre === genre.slug ? "genre" : "default"}
                    clickable
                    onClick={() => setSelectedGenre(genre.slug)}
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
                  "gap-4 md:gap-6",
                  viewMode === "grid"
                    ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                    : "flex flex-col"
                )}
              >
                {albums.map((album, index) => (
                  <motion.div
                    key={album.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <AlbumCard album={album} />
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
      <MiniPlayer />
    </div>
  );
}
