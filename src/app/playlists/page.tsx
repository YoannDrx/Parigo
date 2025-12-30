"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ListMusic, Music, Loader2, Sparkles, TrendingUp, Heart, Zap } from "lucide-react";

interface Playlist {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover: string | null;
  trackCount: number;
  category: string | null;
  isFeatured: boolean;
}

// Category icons
const categoryIcons: Record<string, React.ElementType> = {
  featured: Sparkles,
  trending: TrendingUp,
  mood: Heart,
  energy: Zap,
  default: ListMusic,
};

const categoryLabels: Record<string, string> = {
  featured: "En vedette",
  trending: "Tendances",
  mood: "Ambiances",
  energy: "Énergie",
};

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      const response = await fetch("/api/playlists");
      if (response.ok) {
        const data = await response.json();
        setPlaylists(data.playlists || []);
      }
    } catch (error) {
      console.error("Error loading playlists:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    playlists.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [playlists]);

  // Filter playlists
  const filteredPlaylists = useMemo(() => {
    if (!activeCategory) return playlists;
    return playlists.filter((p) => p.category === activeCategory);
  }, [playlists, activeCategory]);

  // Group by category
  const groupedPlaylists = useMemo(() => {
    if (activeCategory) {
      return { [activeCategory]: filteredPlaylists };
    }

    const groups: Record<string, Playlist[]> = {};

    // Featured first
    const featured = playlists.filter((p) => p.isFeatured);
    if (featured.length > 0) {
      groups["featured"] = featured;
    }

    // Then by category
    categories.forEach((cat) => {
      const catPlaylists = playlists.filter((p) => p.category === cat && !p.isFeatured);
      if (catPlaylists.length > 0) {
        groups[cat] = catPlaylists;
      }
    });

    // Uncategorized
    const uncategorized = playlists.filter((p) => !p.category && !p.isFeatured);
    if (uncategorized.length > 0) {
      groups["other"] = uncategorized;
    }

    return groups;
  }, [playlists, categories, activeCategory, filteredPlaylists]);

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
            <div className="w-14 h-14 bg-[var(--color-primary)] rounded-[var(--radius-md)] border-2 border-[var(--color-black)] shadow-[3px_3px_0px_var(--color-black)] flex items-center justify-center">
              <ListMusic size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[var(--color-black)]">
                Playlists
              </h1>
              <p className="text-[var(--color-gray-600)]">
                {playlists.length} playlist{playlists.length > 1 ? "s" : ""} éditoriales
              </p>
            </div>
          </div>
          <p className="text-lg text-[var(--color-gray-600)] max-w-2xl">
            Découvrez nos sélections musicales curées par notre équipe.
          </p>
        </motion.div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCategory(null)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full border-2 transition-all ${
                  activeCategory === null
                    ? "bg-[var(--color-black)] text-white border-[var(--color-black)]"
                    : "bg-white text-[var(--color-black)] border-[var(--color-black)] hover:shadow-[2px_2px_0px_var(--color-black)]"
                }`}
              >
                <ListMusic size={18} />
                <span className="font-medium">Toutes</span>
              </button>
              {categories.map((category) => {
                const Icon = categoryIcons[category] || categoryIcons.default;
                return (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full border-2 transition-all ${
                      activeCategory === category
                        ? "bg-[var(--color-black)] text-white border-[var(--color-black)]"
                        : "bg-white text-[var(--color-black)] border-[var(--color-black)] hover:shadow-[2px_2px_0px_var(--color-black)]"
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-medium capitalize">
                      {categoryLabels[category] || category}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Playlists */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
          </div>
        ) : playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-[var(--color-gray-100)] rounded-full flex items-center justify-center mb-4">
              <ListMusic size={40} className="text-[var(--color-gray-400)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--color-black)] mb-2">
              Aucune playlist
            </h3>
            <p className="text-[var(--color-gray-600)]">
              Les playlists seront bientôt disponibles.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(groupedPlaylists).map(([category, categoryPlaylists]) => {
              const Icon = categoryIcons[category] || categoryIcons.default;
              return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Icon size={24} className="text-[var(--color-primary)]" />
                    <h2 className="text-2xl font-bold text-[var(--color-black)] capitalize">
                      {categoryLabels[category] || category === "other" ? "Autres" : category}
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {categoryPlaylists.map((playlist, index) => (
                      <motion.div
                        key={playlist.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <Link href={`/playlists/${playlist.slug}`}>
                          <div className="group bg-white border-2 border-[var(--color-black)] rounded-[var(--radius-md)] shadow-[4px_4px_0px_var(--color-black)] overflow-hidden hover:shadow-[6px_6px_0px_var(--color-black)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
                            {/* Cover */}
                            <div className="relative aspect-square">
                              {playlist.cover ? (
                                <Image
                                  src={playlist.cover}
                                  alt={playlist.title}
                                  fill
                                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center">
                                  <ListMusic size={48} className="text-white" />
                                </div>
                              )}

                              {/* Featured badge */}
                              {playlist.isFeatured && (
                                <div className="absolute top-2 left-2 px-2 py-1 bg-[var(--color-accent)] text-[var(--color-black)] text-xs font-bold rounded-full border border-[var(--color-black)]">
                                  <Sparkles size={12} className="inline mr-1" />
                                  Vedette
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="p-4">
                              <h3 className="font-semibold text-[var(--color-black)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                                {playlist.title}
                              </h3>
                              {playlist.description && (
                                <p className="text-sm text-[var(--color-gray-600)] truncate mt-1">
                                  {playlist.description}
                                </p>
                              )}
                              <div className="flex items-center gap-1 mt-2 text-sm text-[var(--color-gray-500)]">
                                <Music size={14} />
                                <span>{playlist.trackCount} pistes</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
