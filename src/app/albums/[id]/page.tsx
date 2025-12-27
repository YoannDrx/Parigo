"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play, Heart, Share2, ArrowLeft, Clock, Music } from "lucide-react";
import { Header, Footer } from "@/components/layout";
import { Button, Tag, Card } from "@/components/ui";
import { TrackRow, AlbumCard, MiniPlayer } from "@/components/features";
import { getAlbumById, mockAlbums } from "@/lib/mock-data";
import { formatDuration } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player-store";

interface AlbumPageProps {
  params: Promise<{ id: string }>;
}

export default function AlbumPage({ params }: AlbumPageProps) {
  const { id } = use(params);
  const album = getAlbumById(id);
  const { setQueue, play } = usePlayerStore();

  if (!album) {
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

  const totalDuration = album.tracks.reduce((acc, track) => acc + track.duration, 0);

  const handlePlayAll = () => {
    setQueue(album.tracks, 0);
    play(album.tracks[0]);
  };

  // Albums similaires (même genre)
  const similarAlbums = mockAlbums
    .filter(
      (a) =>
        a.id !== album.id &&
        a.genres.some((g) => album.genres.includes(g))
    )
    .slice(0, 4);

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
              <p className="text-sm font-medium text-[var(--color-primary)] mb-2">
                {album.label}
              </p>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--color-black)] mb-4">
                {album.title}
              </h1>
              <p className="text-[var(--color-gray-600)] mb-6 max-w-xl">
                {album.description}
              </p>

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
                <span>
                  Sorti le {new Date(album.releaseDate).toLocaleDateString("fr-FR")}
                </span>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-8">
                {album.genres.map((genre) => (
                  <Link key={genre} href={`/search?genre=${genre}`}>
                    <Tag variant="genre" clickable>
                      {genre}
                    </Tag>
                  </Link>
                ))}
                {album.moods.map((mood) => (
                  <Link key={mood} href={`/search?mood=${mood}`}>
                    <Tag variant="mood" clickable>
                      {mood}
                    </Tag>
                  </Link>
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" size="lg" onClick={handlePlayAll}>
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
          <Card padding="none" className="divide-y divide-[var(--color-gray-100)]">
            {album.tracks.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                album={album}
                index={index}
                showAlbumCover={false}
              />
            ))}
          </Card>
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
