"use client";

import { useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Grid3X3,
  List,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";
import { Header, Footer } from "@/components/layout";
import { Button, Tag, Card, Input } from "@/components/ui";
import { TrackRow, SearchBar, MiniPlayer } from "@/components/features";
import {
  getAllTracks,
  mockAlbums,
  GENRES,
  MOODS,
  INSTRUMENTS,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { ViewMode, Track } from "@/types";

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialGenre = searchParams.get("genre") || "";
  const initialMood = searchParams.get("mood") || "";

  const [query, setQuery] = useState(initialQuery);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showFilters, setShowFilters] = useState(true);

  // Filter states
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    initialGenre ? [initialGenre] : []
  );
  const [selectedMoods, setSelectedMoods] = useState<string[]>(
    initialMood ? [initialMood] : []
  );
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [bpmRange, setBpmRange] = useState<[number, number]>([60, 180]);
  const [durationRange, setDurationRange] = useState<[number, number]>([0, 300]);
  const [isVocal, setIsVocal] = useState<boolean | null>(null);

  // Collapsed sections
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set()
  );

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const allTracks = getAllTracks();

  const filteredTracks = useMemo(() => {
    return allTracks.filter((track) => {
      // Text search
      if (query) {
        const lowerQuery = query.toLowerCase();
        const album = mockAlbums.find((a) => a.id === track.albumId);
        const matchesTitle = track.title.toLowerCase().includes(lowerQuery);
        const matchesAlbum = album?.title.toLowerCase().includes(lowerQuery);
        const matchesGenre = track.genres.some((g) =>
          g.toLowerCase().includes(lowerQuery)
        );
        const matchesMood = track.moods.some((m) =>
          m.toLowerCase().includes(lowerQuery)
        );
        if (!matchesTitle && !matchesAlbum && !matchesGenre && !matchesMood) {
          return false;
        }
      }

      // Genres
      if (
        selectedGenres.length > 0 &&
        !selectedGenres.some((g) => track.genres.includes(g))
      ) {
        return false;
      }

      // Moods
      if (
        selectedMoods.length > 0 &&
        !selectedMoods.some((m) => track.moods.includes(m))
      ) {
        return false;
      }

      // Instruments
      if (
        selectedInstruments.length > 0 &&
        !selectedInstruments.some((i) => track.instruments.includes(i))
      ) {
        return false;
      }

      // BPM
      if (track.bpm < bpmRange[0] || track.bpm > bpmRange[1]) {
        return false;
      }

      // Duration
      if (track.duration < durationRange[0] || track.duration > durationRange[1]) {
        return false;
      }

      // Vocal
      if (isVocal !== null && track.isVocal !== isVocal) {
        return false;
      }

      return true;
    });
  }, [
    allTracks,
    query,
    selectedGenres,
    selectedMoods,
    selectedInstruments,
    bpmRange,
    durationRange,
    isVocal,
  ]);

  const resetFilters = useCallback(() => {
    setQuery("");
    setSelectedGenres([]);
    setSelectedMoods([]);
    setSelectedInstruments([]);
    setBpmRange([60, 180]);
    setDurationRange([0, 300]);
    setIsVocal(null);
  }, []);

  const hasActiveFilters =
    query ||
    selectedGenres.length > 0 ||
    selectedMoods.length > 0 ||
    selectedInstruments.length > 0 ||
    bpmRange[0] !== 60 ||
    bpmRange[1] !== 180 ||
    durationRange[0] !== 0 ||
    durationRange[1] !== 300 ||
    isVocal !== null;

  const toggleArrayFilter = (
    arr: string[],
    setArr: (arr: string[]) => void,
    value: string
  ) => {
    if (arr.includes(value)) {
      setArr(arr.filter((v) => v !== value));
    } else {
      setArr([...arr, value]);
    }
  };

  const FilterSection = ({
    title,
    id,
    children,
  }: {
    title: string;
    id: string;
    children: React.ReactNode;
  }) => {
    const isCollapsed = collapsedSections.has(id);
    return (
      <div className="border-b border-[var(--color-gray-100)] pb-4">
        <button
          onClick={() => toggleSection(id)}
          className="flex items-center justify-between w-full py-2 text-left"
        >
          <span className="font-semibold text-[var(--color-black)]">{title}</span>
          {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
        {!isCollapsed && <div className="mt-2">{children}</div>}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Search Bar */}
          <div className="mb-8">
            <SearchBar
              defaultValue={query}
              onSearch={setQuery}
              placeholder="Rechercher par titre, genre, mood..."
            />
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
            <aside
              className={cn(
                "lg:w-72 flex-shrink-0",
                showFilters ? "block" : "hidden lg:block"
              )}
            >
              <Card padding="md" hover={false}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-[var(--color-black)]">Filtres</h2>
                  {hasActiveFilters && (
                    <button
                      onClick={resetFilters}
                      className="text-sm text-[var(--color-primary)] hover:underline flex items-center gap-1"
                    >
                      <RotateCcw size={14} />
                      Réinitialiser
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Genres */}
                  <FilterSection title="Genres" id="genres">
                    <div className="flex flex-wrap gap-2">
                      {GENRES.map((genre) => (
                        <Tag
                          key={genre}
                          variant={
                            selectedGenres.includes(genre) ? "genre" : "default"
                          }
                          size="sm"
                          clickable
                          onClick={() =>
                            toggleArrayFilter(
                              selectedGenres,
                              setSelectedGenres,
                              genre
                            )
                          }
                        >
                          {genre}
                          {selectedGenres.includes(genre) && (
                            <X size={12} className="ml-1" />
                          )}
                        </Tag>
                      ))}
                    </div>
                  </FilterSection>

                  {/* Moods */}
                  <FilterSection title="Moods" id="moods">
                    <div className="flex flex-wrap gap-2">
                      {MOODS.map((mood) => (
                        <Tag
                          key={mood}
                          variant={
                            selectedMoods.includes(mood) ? "mood" : "default"
                          }
                          size="sm"
                          clickable
                          onClick={() =>
                            toggleArrayFilter(
                              selectedMoods,
                              setSelectedMoods,
                              mood
                            )
                          }
                        >
                          {mood}
                          {selectedMoods.includes(mood) && (
                            <X size={12} className="ml-1" />
                          )}
                        </Tag>
                      ))}
                    </div>
                  </FilterSection>

                  {/* Instruments */}
                  <FilterSection title="Instruments" id="instruments">
                    <div className="flex flex-wrap gap-2">
                      {INSTRUMENTS.map((instrument) => (
                        <Tag
                          key={instrument}
                          variant={
                            selectedInstruments.includes(instrument)
                              ? "instrument"
                              : "default"
                          }
                          size="sm"
                          clickable
                          onClick={() =>
                            toggleArrayFilter(
                              selectedInstruments,
                              setSelectedInstruments,
                              instrument
                            )
                          }
                        >
                          {instrument}
                          {selectedInstruments.includes(instrument) && (
                            <X size={12} className="ml-1" />
                          )}
                        </Tag>
                      ))}
                    </div>
                  </FilterSection>

                  {/* BPM Range */}
                  <FilterSection title="Tempo (BPM)" id="bpm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={bpmRange[0]}
                          onChange={(e) =>
                            setBpmRange([parseInt(e.target.value) || 60, bpmRange[1]])
                          }
                          className="w-20 text-sm py-1 px-2"
                          min={60}
                          max={180}
                        />
                        <span className="text-[var(--color-gray-400)]">-</span>
                        <Input
                          type="number"
                          value={bpmRange[1]}
                          onChange={(e) =>
                            setBpmRange([bpmRange[0], parseInt(e.target.value) || 180])
                          }
                          className="w-20 text-sm py-1 px-2"
                          min={60}
                          max={180}
                        />
                      </div>
                    </div>
                  </FilterSection>

                  {/* Vocal/Instrumental */}
                  <FilterSection title="Type" id="vocal">
                    <div className="flex gap-2">
                      <Tag
                        variant={isVocal === null ? "primary" : "default"}
                        size="sm"
                        clickable
                        onClick={() => setIsVocal(null)}
                      >
                        Tous
                      </Tag>
                      <Tag
                        variant={isVocal === true ? "primary" : "default"}
                        size="sm"
                        clickable
                        onClick={() => setIsVocal(true)}
                      >
                        Vocal
                      </Tag>
                      <Tag
                        variant={isVocal === false ? "primary" : "default"}
                        size="sm"
                        clickable
                        onClick={() => setIsVocal(false)}
                      >
                        Instrumental
                      </Tag>
                    </div>
                  </FilterSection>
                </div>
              </Card>
            </aside>

            {/* Results */}
            <div className="flex-1">
              {/* Results Header */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-[var(--color-gray-600)]">
                  <span className="font-semibold text-[var(--color-black)]">
                    {filteredTracks.length}
                  </span>{" "}
                  résultats
                </p>

                <div className="flex items-center gap-3">
                  {/* Mobile Filter Toggle */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="lg:hidden"
                  >
                    Filtres
                  </Button>

                  {/* View Toggle */}
                  <div className="flex border-2 border-[var(--color-black)] rounded-[var(--radius-sm)] overflow-hidden">
                    <button
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "p-2 transition-colors",
                        viewMode === "list"
                          ? "bg-[var(--color-black)] text-white"
                          : "bg-white text-[var(--color-black)] hover:bg-[var(--color-gray-100)]"
                      )}
                    >
                      <List size={18} />
                    </button>
                    <button
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "p-2 transition-colors border-l-2 border-[var(--color-black)]",
                        viewMode === "grid"
                          ? "bg-[var(--color-black)] text-white"
                          : "bg-white text-[var(--color-black)] hover:bg-[var(--color-gray-100)]"
                      )}
                    >
                      <Grid3X3 size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Filters */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedGenres.map((genre) => (
                    <Tag
                      key={genre}
                      variant="genre"
                      size="sm"
                      clickable
                      onClick={() =>
                        setSelectedGenres(selectedGenres.filter((g) => g !== genre))
                      }
                    >
                      {genre}
                      <X size={12} className="ml-1" />
                    </Tag>
                  ))}
                  {selectedMoods.map((mood) => (
                    <Tag
                      key={mood}
                      variant="mood"
                      size="sm"
                      clickable
                      onClick={() =>
                        setSelectedMoods(selectedMoods.filter((m) => m !== mood))
                      }
                    >
                      {mood}
                      <X size={12} className="ml-1" />
                    </Tag>
                  ))}
                </div>
              )}

              {/* Track List */}
              {filteredTracks.length > 0 ? (
                <Card padding="none" hover={false}>
                  {filteredTracks.slice(0, 50).map((track, index) => {
                    const album = mockAlbums.find((a) => a.id === track.albumId);
                    return (
                      <TrackRow
                        key={track.id}
                        track={track}
                        album={album}
                        index={index}
                        showAlbumCover={true}
                      />
                    );
                  })}
                </Card>
              ) : (
                <div className="text-center py-16">
                  <p className="text-[var(--color-gray-600)] text-lg mb-4">
                    Aucune piste trouvée avec ces critères.
                  </p>
                  <Button variant="outline" onClick={resetFilters}>
                    Réinitialiser les filtres
                  </Button>
                </div>
              )}

              {filteredTracks.length > 50 && (
                <p className="text-center text-[var(--color-gray-400)] mt-4">
                  Affichage des 50 premiers résultats sur {filteredTracks.length}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <MiniPlayer />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <SearchContent />
    </Suspense>
  );
}
