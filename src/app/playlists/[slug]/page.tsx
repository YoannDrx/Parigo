"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  ListMusic,
  Music,
  Clock,
  ArrowLeft,
  Loader2,
  Play,
  Shuffle,
} from "lucide-react";
import { TrackRow, FavoriteButton } from "@/components/features";
import { Button, Tag } from "@/components/ui";
import { usePlayerStore } from "@/stores/player-store";
import { formatDuration } from "@/lib/utils";
import type { Track, Album } from "@/types";

interface PlaylistDetail {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover: string | null;
  category: string | null;
  trackCount: number;
  totalDuration: number;
  isFeatured: boolean;
  tracks: Array<{
    track: Track;
    album: Album;
  }>;
}

export default function PlaylistDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { play, setQueue } = usePlayerStore();

  useEffect(() => {
    if (slug) {
      loadPlaylist();
    }
  }, [slug]);

  const loadPlaylist = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/playlists/${slug}`);
      if (response.ok) {
        const data = await response.json();
        setPlaylist(data.playlist);
      } else if (response.status === 404) {
        setError("Playlist non trouvée");
      } else {
        setError("Erreur lors du chargement");
      }
    } catch (err) {
      console.error("Error loading playlist:", err);
      setError("Erreur lors du chargement");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAll = () => {
    if (!playlist || playlist.tracks.length === 0) return;
    const tracks = playlist.tracks.map((t) => t.track);
    setQueue(tracks, 0);
    play(tracks[0]);
  };

  const handleShuffle = () => {
    if (!playlist || playlist.tracks.length === 0) return;
    const tracks = [...playlist.tracks.map((t) => t.track)];
    // Fisher-Yates shuffle
    for (let i = tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
    }
    setQueue(tracks, 0);
    play(tracks[0]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-32 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="min-h-screen pt-24 pb-32">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-[var(--color-gray-100)] rounded-full flex items-center justify-center mb-4">
              <ListMusic size={40} className="text-[var(--color-gray-400)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--color-black)] mb-2">
              {error || "Playlist non trouvée"}
            </h3>
            <Link href="/playlists">
              <Button variant="outline" className="mt-4 gap-2">
                <ArrowLeft size={18} />
                Retour aux playlists
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-32">
      <div className="container mx-auto px-4 lg:px-6">
        {/* Back Link */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <Link
            href="/playlists"
            className="inline-flex items-center gap-2 text-[var(--color-gray-600)] hover:text-[var(--color-black)] transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Toutes les playlists</span>
          </Link>
        </motion.div>

        {/* Playlist Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-white border-2 border-[var(--color-black)] rounded-[var(--radius-lg)] shadow-[6px_6px_0px_var(--color-black)] overflow-hidden">
            <div className="flex flex-col md:flex-row">
              {/* Cover */}
              <div className="md:w-72 aspect-square md:aspect-auto relative border-b-2 md:border-b-0 md:border-r-2 border-[var(--color-black)]">
                {playlist.cover ? (
                  <Image
                    src={playlist.cover}
                    alt={playlist.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 288px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center">
                    <ListMusic size={96} className="text-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 p-6 md:p-8 flex flex-col">
                <div className="flex-1">
                  {playlist.category && (
                    <Tag variant="genre" size="sm" className="mb-3">
                      {playlist.category}
                    </Tag>
                  )}

                  <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-black)] mb-3">
                    {playlist.title}
                  </h1>

                  {playlist.description && (
                    <p className="text-[var(--color-gray-600)] mb-4 max-w-2xl">
                      {playlist.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex flex-wrap gap-4 text-[var(--color-gray-600)]">
                    <span className="flex items-center gap-1.5">
                      <Music size={16} />
                      {playlist.trackCount} piste{playlist.trackCount > 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={16} />
                      {formatDuration(playlist.totalDuration)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3 mt-6">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handlePlayAll}
                    className="gap-2"
                    disabled={playlist.tracks.length === 0}
                  >
                    <Play size={20} className="fill-current" />
                    Lecture
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleShuffle}
                    className="gap-2"
                    disabled={playlist.tracks.length === 0}
                  >
                    <Shuffle size={20} />
                    Aléatoire
                  </Button>
                  <FavoriteButton type="playlist" itemId={playlist.id} size="lg" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Track List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-2xl font-bold text-[var(--color-black)] mb-4">
            Pistes
          </h2>

          {playlist.tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-[var(--color-gray-100)] rounded-[var(--radius-md)]">
              <Music size={48} className="text-[var(--color-gray-400)] mb-4" />
              <p className="text-[var(--color-gray-600)]">
                Cette playlist ne contient pas encore de pistes.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {playlist.tracks.map(({ track, album }, index) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  album={album}
                  index={index}
                  showWaveform={true}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
