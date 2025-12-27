"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Grid3X3, List, SlidersHorizontal } from "lucide-react";
import { Header, Footer } from "@/components/layout";
import { Button, Tag } from "@/components/ui";
import { AlbumCard, MiniPlayer } from "@/components/features";
import { mockAlbums, mockLabels, GENRES } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/types";

export default function AlbumsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filteredAlbums = useMemo(() => {
    return mockAlbums.filter((album) => {
      if (selectedLabel && album.label !== selectedLabel) return false;
      if (selectedGenre && !album.genres.includes(selectedGenre)) return false;
      return true;
    });
  }, [selectedLabel, selectedGenre]);

  const uniqueLabels = useMemo(() => {
    return [...new Set(mockAlbums.map((a) => a.label))];
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-black)]">
                Albums
              </h1>
              <p className="text-[var(--color-gray-600)] mt-1">
                {filteredAlbums.length} albums disponibles
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Filter Toggle (Mobile) */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden gap-2"
              >
                <SlidersHorizontal size={16} />
                Filtres
              </Button>

              {/* View Toggle */}
              <div className="flex border-2 border-[var(--color-black)] rounded-[var(--radius-sm)] overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-2 transition-colors",
                    viewMode === "grid"
                      ? "bg-[var(--color-black)] text-white"
                      : "bg-white text-[var(--color-black)] hover:bg-[var(--color-gray-100)]"
                  )}
                >
                  <Grid3X3 size={18} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-2 transition-colors border-l-2 border-[var(--color-black)]",
                    viewMode === "list"
                      ? "bg-[var(--color-black)] text-white"
                      : "bg-white text-[var(--color-black)] hover:bg-[var(--color-gray-100)]"
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
                  Tous
                </Tag>
                {uniqueLabels.map((label) => (
                  <Tag
                    key={label}
                    variant={selectedLabel === label ? "primary" : "default"}
                    clickable
                    onClick={() => setSelectedLabel(label)}
                  >
                    {label}
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
                  Tous
                </Tag>
                {GENRES.slice(0, 8).map((genre) => (
                  <Tag
                    key={genre}
                    variant={selectedGenre === genre ? "genre" : "default"}
                    clickable
                    onClick={() => setSelectedGenre(genre)}
                  >
                    {genre}
                  </Tag>
                ))}
              </div>
            </div>
          </div>

          {/* Albums Grid */}
          <div
            className={cn(
              "gap-4 md:gap-6",
              viewMode === "grid"
                ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                : "flex flex-col"
            )}
          >
            {filteredAlbums.map((album, index) => (
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
          {filteredAlbums.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[var(--color-gray-600)] text-lg mb-4">
                Aucun album trouvé avec ces filtres.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedLabel(null);
                  setSelectedGenre(null);
                }}
              >
                Réinitialiser les filtres
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
      <MiniPlayer />
    </div>
  );
}
