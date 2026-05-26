"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play, Heart, Share2, ArrowLeft, Clock, Music, Loader2 } from "lucide-react";
import { Header, Footer } from "@/components/layout";
import { Button, Tag, Card } from "@/components/ui";
import { TrackRow, AlbumCard, MiniPlayer } from "@/components/features";
import { useAlbum } from "@/hooks/use-api";
import { formatDuration } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player-store";
import type { Track, Album } from "@/types";

interface AlbumPageProps {
  params: Promise<{ id: string }>;
}

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
  trackNumber?: number;
  albumId: string;
  albumTitle: string;
  albumSlug: string;
  albumCover: string;
  genres: string[];
  moods: string[];
  instruments?: string[];
}): Track {
  return {
    id: apiTrack.id,
    slug: apiTrack.slug,
    title: apiTrack.title,
    duration: apiTrack.duration,
    bpm: apiTrack.bpm ?? null,
    key: apiTrack.key ?? null,
    isVocal: apiTrack.isVocal,
    audioUrl: apiTrack.audioUrl,
    waveform: apiTrack.waveform,
    trackNumber: apiTrack.trackNumber,
    albumId: apiTrack.albumId,
    albumTitle: apiTrack.albumTitle,
    albumSlug: apiTrack.albumSlug,
    albumCover: apiTrack.albumCover,
    genres: apiTrack.genres,
    moods: apiTrack.moods,
    instruments: apiTrack.instruments,
  };
}

// Transform API album to component format
function transformAlbum(apiAlbum: {
  id: string;
  slug?: string;
  title: string;
  description?: string | null;
  cover: string;
  coverBlur?: string;
  label: string;
  labelSlug?: string;
  releaseDate?: string;
  year?: number;
  spotifyUrl?: string;
  genres: Array<{ name: string; slug: string; color?: string }>;
  moods: Array<{ name: string; slug: string; color?: string }>;
  artists: Array<{ name: string; slug: string; role?: string }>;
  trackCount: number;
  isFeatured?: boolean;
}): Album {
  return {
    id: apiAlbum.slug || apiAlbum.id,
    slug: apiAlbum.slug,
    title: apiAlbum.title,
    description: apiAlbum.description,
    cover: apiAlbum.cover,
    coverBlur: apiAlbum.coverBlur,
    label: apiAlbum.label,
    labelSlug: apiAlbum.labelSlug,
    releaseDate: apiAlbum.releaseDate,
    year: apiAlbum.year,
    spotifyUrl: apiAlbum.spotifyUrl,
    genres: apiAlbum.genres.map((g) => g.name),
    moods: apiAlbum.moods.map((m) => m.name),
    artists: apiAlbum.artists,
    trackCount: apiAlbum.trackCount,
    isFeatured: apiAlbum.isFeatured,
  };
}

export default function AlbumPage({ params }: AlbumPageProps) {
  const { id } = use(params);
  const { data, isLoading, error } = useAlbum(id);
  const { setQueue, play } = usePlayerStore();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--color-primary)]" />
        </main>
        <Footer />
      </div>
    );
  }

  // Error or not found state
  if (error || !data?.album) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Album non trouvé</h1>
            <Link href="/albums">
              <Button variant="primary">Retour aux albums</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const album = transformAlbum(data.album);
  const tracks = data.album.tracks?.map(transformTrack) ?? [];
  const similarAlbums = data.similarAlbums?.map(transformAlbum) ?? [];

  // Create album with tracks for TrackRow
  const albumWithTracks: Album = {
    ...album,
    tracks,
  };

  const totalDuration = tracks.reduce((acc, track) => acc + track.duration, 0);

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      setQueue(tracks, 0);
      play(tracks[0]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pb-24">
        {/* Back Link */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/albums"
            className="inline-flex items-center gap-2 text-[var(--color-gray-600)] hover:text-[var(--color-black)] transition-colors"
          >
            <ArrowLeft size={18} />
            Retour aux albums
          </Link>
        </div>

        {/* Album Header */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Cover */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full md:w-80 flex-shrink-0"
            >
              <Card padding="none" className="overflow-hidden aspect-square relative">
                <Image
                  src={album.cover}
                  alt={album.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 320px"
                  className="object-cover"
                  priority
                />
              </Card>
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1"
            >
              {album.labelSlug ? (
                <Link href={`/labels/${album.labelSlug}`}>
                  <p className="text-sm font-medium text-[var(--color-primary)] mb-2 hover:underline">
                    {album.label}
                  </p>
                </Link>
              ) : (
                <p className="text-sm font-medium text-[var(--color-primary)] mb-2">
                  {album.label}
                </p>
              )}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--color-black)] mb-4">
                {album.title}
              </h1>
              {album.description && (
                <p className="text-[var(--color-gray-600)] mb-6 max-w-xl">
                  {album.description}
                </p>
              )}

              {/* Artists */}
              {album.artists && album.artists.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="text-sm text-[var(--color-gray-600)]">Par</span>
                  {album.artists.map((artist, index) => (
                    <span key={artist.slug}>
                      <Link
                        href={`/artists/${artist.slug}`}
                        className="text-sm font-medium text-[var(--color-black)] hover:text-[var(--color-primary)]"
                      >
                        {artist.name}
                      </Link>
                      {index < album.artists!.length - 1 && ", "}
                    </span>
                  ))}
                </div>
              )}

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-gray-600)] mb-6">
                <span className="flex items-center gap-1">
                  <Music size={16} />
                  {album.trackCount} pistes
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={16} />
                  {formatDuration(totalDuration)}
                </span>
                {album.releaseDate && (
                  <span>
                    Sorti le {new Date(album.releaseDate).toLocaleDateString("fr-FR")}
                  </span>
                )}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-8">
                {album.genres.map((genre) => (
                  <Link key={genre} href={`/search?genre=${genre.toLowerCase().replace(/\s+/g, "-")}`}>
                    <Tag variant="genre" clickable>
                      {genre}
                    </Tag>
                  </Link>
                ))}
                {album.moods?.map((mood) => (
                  <Link key={mood} href={`/search?mood=${mood.toLowerCase().replace(/\s+/g, "-")}`}>
                    <Tag variant="mood" clickable>
                      {mood}
                    </Tag>
                  </Link>
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" size="lg" onClick={handlePlayAll} disabled={tracks.length === 0}>
                  <Play size={20} className="mr-2 fill-white" />
                  Tout écouter
                </Button>
                <Button variant="outline" size="lg">
                  <Heart size={20} className="mr-2" />
                  Favoris
                </Button>
                <Button variant="ghost" size="lg">
                  <Share2 size={20} />
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Tracks */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-xl font-bold text-[var(--color-black)] mb-6">
            Pistes
          </h2>
          {tracks.length > 0 ? (
            <Card padding="none" className="divide-y divide-[var(--color-gray-100)]">
              {tracks.map((track, index) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <TrackRow
                    track={track}
                    album={albumWithTracks}
                    index={index}
                    showAlbumCover={false}
                  />
                </motion.div>
              ))}
            </Card>
          ) : (
            <Card padding="lg" hover={false}>
              <p className="text-center text-[var(--color-gray-600)]">
                Aucune piste disponible pour cet album.
              </p>
            </Card>
          )}
        </section>

        {/* Similar Albums */}
        {similarAlbums.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <h2 className="text-xl font-bold text-[var(--color-black)] mb-6">
              Albums similaires
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {similarAlbums.map((similarAlbum, index) => (
                <motion.div
                  key={similarAlbum.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <AlbumCard album={similarAlbum} />
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
      <MiniPlayer />
    </div>
  );
}
