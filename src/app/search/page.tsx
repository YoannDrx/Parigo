"use client";

import { useState, useCallback, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Grid3X3,
  List,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { Header, Footer } from "@/components/layout";
import { Button, Tag, Card, Input } from "@/components/ui";
import { TrackRow, SearchBar, MiniPlayer } from "@/components/features";
import { useTracks, useGenres, useMoods, useInstruments } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import type { ViewMode, Track, Album } from "@/types";

// Transform API track to component format
function transformTrack(apiTrack: {
  id: string;
  slug?: string;
  title: string;
  duration: number;
  bpm?: number;
  key?: string;
  isVocal: boolean;
  audioUrl: string | null;
  waveform: number[] | null;
  albumId: string;
  albumTitle: string;
  albumSlug: string;
  albumCover: string;
  genres: string[];
  moods: string[];
  instruments?: string[];
}): Track {
  return {
    id: apiTrack.slug || apiTrack.id,
    slug: apiTrack.slug,
    title: apiTrack.title,
    duration: apiTrack.duration,
    bpm: apiTrack.bpm ?? null,
    key: apiTrack.key ?? null,
    isVocal: apiTrack.isVocal,
    audioUrl: apiTrack.audioUrl,
    waveform: apiTrack.waveform,
    albumId: apiTrack.albumId,
    albumTitle: apiTrack.albumTitle,
    albumSlug: apiTrack.albumSlug,
    albumCover: apiTrack.albumCover,
    genres: apiTrack.genres,
    moods: apiTrack.moods,
    instruments: apiTrack.instruments,
  };
}

// Create minimal album object for TrackRow
function createAlbumFromTrack(track: Track): Album {
  return {
    id: track.albumId,
    slug: track.albumSlug,
    title: track.albumTitle || "",
    cover: track.albumCover || "/images/placeholder-album.jpg",
    label: "",
    genres: track.genres,
    trackCount: 0,
  };
}

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

  // Fetch filter options from API
  const { data: genresData } = useGenres();
  const { data: moodsData } = useMoods();
  const { data: instrumentsData } = useInstruments();

  const genres = genresData?.genres ?? [];
  const moods = moodsData?.moods ?? [];
  const instruments = instrumentsData?.instruments ?? [];

  // Build API params
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

  // Create API params object
  const apiParams = useMemo(() => {
    const params: Parameters<typeof useTracks>[0] = {
      limit: 50,
    };

    if (query) params.query = query;
    if (selectedGenres.length > 0) params.genres = selectedGenres;
    if (selectedMoods.length > 0) params.moods = selectedMoods;
    if (selectedInstruments.length > 0) params.instruments = selectedInstruments;
    if (bpmRange[0] !== 60) params.minBpm = bpmRange[0];
    if (bpmRange[1] !== 180) params.maxBpm = bpmRange[1];
    if (durationRange[0] !== 0) params.minDuration = durationRange[0];
    if (durationRange[1] !== 300) params.maxDuration = durationRange[1];
    if (isVocal !== null) params.isVocal = isVocal;

    return params;
  }, [query, selectedGenres, selectedMoods, selectedInstruments, bpmRange, durationRange, isVocal]);

  // Fetch tracks from API
  const { data: tracksData, isLoading: tracksLoading } = useTracks(apiParams);

  const tracks = tracksData?.tracks.map(transformTrack) ?? [];
  const totalCount = tracksData?.pagination.total ?? 0;

  const resetFilters = useCallback(() => {
    setQuery("");
    setSelectedGenres([]);
    setSelectedMoods([]);
    setSelectedInstruments([]);
    setBpmRange([60, 180]);
    setDurationRange([0, 300]);
    setIsVocal(null);
  }, []);

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
                      {genres.map((genre) => (
                        <Tag
                          key={genre.slug}
                          variant={
                            selectedGenres.includes(genre.slug) ? "genre" : "default"
                          }
                          size="sm"
                          clickable
                          onClick={() =>
                            toggleArrayFilter(
                              selectedGenres,
                              setSelectedGenres,
                              genre.slug
                            )
                          }
                        >
                          {genre.name}
                          {selectedGenres.includes(genre.slug) && (
                            <X size={12} className="ml-1" />
                          )}
                        </Tag>
                      ))}
                    </div>
                  </FilterSection>

                  {/* Moods */}
                  <FilterSection title="Moods" id="moods">
                    <div className="flex flex-wrap gap-2">
                      {moods.map((mood) => (
                        <Tag
                          key={mood.slug}
                          variant={
                            selectedMoods.includes(mood.slug) ? "mood" : "default"
                          }
                          size="sm"
                          clickable
                          onClick={() =>
                            toggleArrayFilter(
                              selectedMoods,
                              setSelectedMoods,
                              mood.slug
                            )
                          }
                        >
                          {mood.name}
                          {selectedMoods.includes(mood.slug) && (
                            <X size={12} className="ml-1" />
                          )}
                        </Tag>
                      ))}
                    </div>
                  </FilterSection>

                  {/* Instruments */}
                  <FilterSection title="Instruments" id="instruments">
                    <div className="flex flex-wrap gap-2">
                      {instruments.map((instrument) => (
                        <Tag
                          key={instrument.slug}
                          variant={
                            selectedInstruments.includes(instrument.slug)
                              ? "instrument"
                              : "default"
                          }
                          size="sm"
                          clickable
                          onClick={() =>
                            toggleArrayFilter(
                              selectedInstruments,
                              setSelectedInstruments,
                              instrument.slug
                            )
                          }
                        >
                          {instrument.name}
                          {selectedInstruments.includes(instrument.slug) && (
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
                    {totalCount}
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
                  {selectedGenres.map((genreSlug) => {
                    const genre = genres.find((g) => g.slug === genreSlug);
                    return (
                      <Tag
                        key={genreSlug}
                        variant="genre"
                        size="sm"
                        clickable
                        onClick={() =>
                          setSelectedGenres(selectedGenres.filter((g) => g !== genreSlug))
                        }
                      >
                        {genre?.name || genreSlug}
                        <X size={12} className="ml-1" />
                      </Tag>
                    );
                  })}
                  {selectedMoods.map((moodSlug) => {
                    const mood = moods.find((m) => m.slug === moodSlug);
                    return (
                      <Tag
                        key={moodSlug}
                        variant="mood"
                        size="sm"
                        clickable
                        onClick={() =>
                          setSelectedMoods(selectedMoods.filter((m) => m !== moodSlug))
                        }
                      >
                        {mood?.name || moodSlug}
                        <X size={12} className="ml-1" />
                      </Tag>
                    );
                  })}
                </div>
              )}

              {/* Loading State */}
              {tracksLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-10 h-10 animate-spin text-[var(--color-primary)]" />
                </div>
              ) : (
                <>
                  {/* Track List */}
                  {tracks.length > 0 ? (
                    <Card padding="none" hover={false}>
                      {tracks.map((track, index) => (
                        <motion.div
                          key={track.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                        >
                          <TrackRow
                            track={track}
                            album={createAlbumFromTrack(track)}
                            index={index}
                            showAlbumCover={true}
                          />
                        </motion.div>
                      ))}
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

                  {totalCount > 50 && (
                    <p className="text-center text-[var(--color-gray-400)] mt-4">
                      Affichage des 50 premiers résultats sur {totalCount}
                    </p>
                  )}
                </>
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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--color-primary)]" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
