"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Users, Music, Disc3, Loader2, Search } from "lucide-react";

interface Artist {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  albumCount: number;
  trackCount: number;
}

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);

  useEffect(() => {
    loadArtists();
  }, []);

  const loadArtists = async () => {
    try {
      const response = await fetch("/api/artists");
      if (response.ok) {
        const data = await response.json();
        setArtists(data.artists || []);
      }
    } catch (error) {
      console.error("Error loading artists:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get available first letters
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    artists.forEach((artist) => {
      const firstLetter = artist.name.charAt(0).toUpperCase();
      if (/[A-Z]/.test(firstLetter)) {
        letters.add(firstLetter);
      } else {
        letters.add("#");
      }
    });
    return Array.from(letters).sort((a, b) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b);
    });
  }, [artists]);

  // Filter artists
  const filteredArtists = useMemo(() => {
    let result = artists;

    if (searchQuery) {
      result = result.filter((artist) =>
        artist.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedLetter) {
      result = result.filter((artist) => {
        const firstLetter = artist.name.charAt(0).toUpperCase();
        if (selectedLetter === "#") {
          return !/[A-Z]/.test(firstLetter);
        }
        return firstLetter === selectedLetter;
      });
    }

    return result;
  }, [artists, searchQuery, selectedLetter]);

  // Group by first letter
  const groupedArtists = useMemo(() => {
    const groups: Record<string, Artist[]> = {};
    filteredArtists.forEach((artist) => {
      const firstLetter = artist.name.charAt(0).toUpperCase();
      const key = /[A-Z]/.test(firstLetter) ? firstLetter : "#";
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(artist);
    });
    return groups;
  }, [filteredArtists]);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

  return (
    <div className="min-h-screen pt-24 pb-32">
      <div className="container mx-auto px-4 lg:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-[var(--color-secondary)] rounded-[var(--radius-md)] border-2 border-[var(--color-black)] shadow-[3px_3px_0px_var(--color-black)] flex items-center justify-center">
              <Users size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[var(--color-black)]">
                Artistes
              </h1>
              <p className="text-[var(--color-gray-600)]">
                {artists.length} artiste{artists.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Search & Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 space-y-4"
        >
          {/* Search */}
          <div className="relative max-w-md">
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-gray-400)]"
            />
            <input
              type="text"
              placeholder="Rechercher un artiste..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-[var(--color-black)] rounded-[var(--radius-md)] shadow-[3px_3px_0px_var(--color-black)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Alphabet Filter */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedLetter(null)}
              className={`w-8 h-8 rounded-[var(--radius-sm)] text-sm font-bold transition-all ${
                selectedLetter === null
                  ? "bg-[var(--color-black)] text-white"
                  : "bg-[var(--color-gray-100)] text-[var(--color-gray-600)] hover:bg-[var(--color-gray-200)]"
              }`}
            >
              All
            </button>
            {alphabet.map((letter) => {
              const isAvailable = availableLetters.includes(letter);
              return (
                <button
                  key={letter}
                  onClick={() => isAvailable && setSelectedLetter(letter)}
                  disabled={!isAvailable}
                  className={`w-8 h-8 rounded-[var(--radius-sm)] text-sm font-bold transition-all ${
                    selectedLetter === letter
                      ? "bg-[var(--color-black)] text-white"
                      : isAvailable
                      ? "bg-[var(--color-gray-100)] text-[var(--color-gray-600)] hover:bg-[var(--color-gray-200)]"
                      : "bg-[var(--color-gray-50)] text-[var(--color-gray-300)] cursor-not-allowed"
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Artists List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
          </div>
        ) : filteredArtists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-[var(--color-gray-100)] rounded-full flex items-center justify-center mb-4">
              <Users size={40} className="text-[var(--color-gray-400)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--color-black)] mb-2">
              Aucun artiste trouvé
            </h3>
            <p className="text-[var(--color-gray-600)]">
              Essayez une autre recherche ou lettre.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedArtists)
              .sort(([a], [b]) => {
                if (a === "#") return 1;
                if (b === "#") return -1;
                return a.localeCompare(b);
              })
              .map(([letter, letterArtists]) => (
                <motion.div
                  key={letter}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4 sticky top-20 bg-[var(--color-background)] py-2 z-10">
                    {letter}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {letterArtists.map((artist, index) => (
                      <motion.div
                        key={artist.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.02 }}
                      >
                        <Link href={`/artists/${artist.slug}`}>
                          <div className="group bg-white border-2 border-[var(--color-black)] rounded-[var(--radius-md)] shadow-[3px_3px_0px_var(--color-black)] overflow-hidden hover:shadow-[5px_5px_0px_var(--color-black)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-center p-4">
                            {/* Avatar */}
                            <div className="relative w-20 h-20 mx-auto mb-3">
                              {artist.image ? (
                                <Image
                                  src={artist.image}
                                  alt={artist.name}
                                  fill
                                  sizes="80px"
                                  className="object-cover rounded-full border-2 border-[var(--color-black)]"
                                />
                              ) : (
                                <div className="w-full h-full rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center border-2 border-[var(--color-black)]">
                                  <span className="text-white text-xl font-bold">
                                    {artist.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Name */}
                            <h3 className="font-semibold text-[var(--color-black)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                              {artist.name}
                            </h3>

                            {/* Stats */}
                            <div className="flex items-center justify-center gap-3 mt-2 text-xs text-[var(--color-gray-500)]">
                              <span className="flex items-center gap-1">
                                <Disc3 size={12} />
                                {artist.albumCount}
                              </span>
                              <span className="flex items-center gap-1">
                                <Music size={12} />
                                {artist.trackCount}
                              </span>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
