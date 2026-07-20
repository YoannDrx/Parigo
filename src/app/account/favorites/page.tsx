"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Heart, Music, Disc3, ListMusic, Loader2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { TrackRow, AlbumCard, PlaylistCard } from "@/components/features";
import { useI18n } from "@/components/providers/I18nProvider";

type TabType = "tracks" | "albums" | "playlists";

interface FavoriteTrack {
  id: string;
  title: string;
  duration: number;
  bpm: number;
  waveform: number[];
  genres: { name: string; slug: string }[];
  moods: { name: string; slug: string }[];
  album?: {
    id: string;
    title: string;
    cover: string;
  };
}

interface FavoriteAlbum {
  id: string;
  slug: string;
  title: string;
  cover: string;
  label: string;
  genres: { name: string; slug: string }[];
  trackCount: number;
}

interface FavoritePlaylist {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover: string;
  trackCount: number;
  isPublic: boolean;
}

export default function FavoritesPage() {
  const { locale, t } = useI18n();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>("tracks");
  const [tracks, setTracks] = useState<FavoriteTrack[]>([]);
  const [albums, setAlbums] = useState<FavoriteAlbum[]>([]);
  const [playlists, setPlaylists] = useState<FavoritePlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      loadFavorites();
    }
  }, [session?.user]);

  const loadFavorites = async () => {
    setIsLoading(true);
    try {
      const [tracksRes, albumsRes, playlistsRes] = await Promise.all([
        fetch("/api/user/favorites/tracks"),
        fetch("/api/user/favorites/albums"),
        fetch("/api/user/favorites/playlists"),
      ]);

      if (tracksRes.ok) {
        const data = await tracksRes.json();
        setTracks(data.tracks || []);
      }
      if (albumsRes.ok) {
        const data = await albumsRes.json();
        setAlbums(data.albums || []);
      }
      if (playlistsRes.ok) {
        const data = await playlistsRes.json();
        setPlaylists(data.playlists || []);
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: "tracks" as TabType, label: t("catalog.tracks"), icon: Music, count: tracks.length },
    { id: "albums" as TabType, label: t("common.albums"), icon: Disc3, count: albums.length },
    { id: "playlists" as TabType, label: t("common.playlists"), icon: ListMusic, count: playlists.length },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <Heart size={24} className="text-red-500" />
        </div>
        <div>
          <h1 className="font-[var(--font-editorial)] text-5xl font-normal tracking-[-.05em]">
            {t("account.favorites")}
          </h1>
          <p className="text-[var(--color-gray-600)]">
            {tracks.length + albums.length + playlists.length} {locale === "fr" ? "éléments" : "items"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2.5 transition-all ${
              activeTab === tab.id
                ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                : "border-[var(--line)] hover:border-[var(--line-strong)]"
            }`}
          >
            <tab.icon size={18} />
            <span className="font-medium">{tab.label}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === tab.id
                  ? "bg-white text-[var(--color-black)]"
                  : "bg-[var(--color-gray-100)] text-[var(--color-gray-600)]"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Tracks Tab */}
            {activeTab === "tracks" && (
              <div className="space-y-2">
                {tracks.length === 0 ? (
                  <EmptyState
                    icon={Music}
                    title={locale === "fr" ? "Aucune piste en favoris" : "No favourite tracks"}
                    description={locale === "fr" ? "Ajoutez des pistes à vos favoris pour les retrouver ici." : "Add tracks to your favourites to find them here."}
                  />
                ) : (
                  tracks.map((track, index) => (
                    <TrackRow
                      key={track.id}
                      track={{
                        id: track.id,
                        title: track.title,
                        duration: track.duration,
                        bpm: track.bpm,
                        waveform: track.waveform,
                        genres: track.genres.map((g) => g.name),
                        moods: track.moods.map((m) => m.name),
                        instruments: [],
                        isVocal: false,
                        audioUrl: null,
                        albumId: track.album?.id || "",
                      }}
                      album={
                        track.album
                          ? {
                              id: track.album.id,
                              title: track.album.title,
                              cover: track.album.cover,
                              label: "",
                              trackCount: 0,
                              genres: [],
                              releaseDate: "",
                              tracks: [],
                            }
                          : undefined
                      }
                      index={index}
                      showWaveform={false}
                    />
                  ))
                )}
              </div>
            )}

            {/* Albums Tab */}
            {activeTab === "albums" && (
              <div>
                {albums.length === 0 ? (
                  <EmptyState
                    icon={Disc3}
                    title={locale === "fr" ? "Aucun album en favoris" : "No favourite albums"}
                    description={locale === "fr" ? "Ajoutez des albums à vos favoris pour les retrouver facilement." : "Add albums to your favourites to find them easily."}
                  />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {albums.map((album) => (
                      <AlbumCard
                        key={album.id}
                        album={{
                          id: album.id,
                          title: album.title,
                          cover: album.cover,
                          label: album.label,
                          trackCount: album.trackCount,
                          genres: album.genres.map((g) => g.name),
                          releaseDate: "",
                          tracks: [],
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Playlists Tab */}
            {activeTab === "playlists" && (
              <div>
                {playlists.length === 0 ? (
                  <EmptyState
                    icon={ListMusic}
                    title={locale === "fr" ? "Aucune playlist en favoris" : "No favourite playlists"}
                    description={locale === "fr" ? "Suivez des playlists pour les retrouver ici." : "Follow playlists to find them here."}
                  />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {playlists.map((playlist) => (
                      <PlaylistCard
                        key={playlist.id}
                        playlist={{
                          id: playlist.id,
                          title: playlist.title,
                          description: playlist.description,
                          cover: playlist.cover,
                          trackCount: playlist.trackCount,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-[var(--color-gray-100)] rounded-full flex items-center justify-center mb-4">
        <Icon size={32} className="text-[var(--color-gray-400)]" />
      </div>
      <h3 className="mb-1 font-[var(--font-editorial)] text-3xl font-normal">
        {title}
      </h3>
      <p className="text-[var(--color-gray-600)]">{description}</p>
    </div>
  );
}
