"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play, Heart, Share2, ArrowLeft, Clock, Music, Loader2 } from "lucide-react";
import { Header, Footer } from "@/components/layout";
import { Button, Tag } from "@/components/ui";
import { TrackRow, AlbumCard, MiniPlayer } from "@/components/features";
import { useAlbum } from "@/hooks/use-api";
import { formatDuration } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player-store";
import type { Track, Album } from "@/types";
import { useI18n } from "@/components/providers/I18nProvider";
import { MediaReveal } from "@/components/motion";
import { localizeCatalogTerm } from "@/i18n/catalog-terms";

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
  const { locale, t } = useI18n();
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
            <h1 className="mb-4 font-[var(--font-editorial)] text-5xl font-normal">{locale === "fr" ? "Album non trouvé" : "Album not found"}</h1>
            <Link href="/albums">
              <Button variant="primary">{t("common.back")} · {t("common.albums")}</Button>
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
    <div className="page-shell flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 pb-24">
        {/* Back Link */}
        <div className="mx-auto max-w-[1700px] px-4 py-6 sm:px-6 lg:px-8">
          <Link
            href="/albums"
            className="inline-flex items-center gap-2 text-[var(--color-gray-600)] hover:text-[var(--color-black)] transition-colors"
          >
            <ArrowLeft size={18} />
            {t("common.back")} · {t("common.albums")}
          </Link>
        </div>

        {/* Album Header */}
        <section className="mx-auto max-w-[1700px] px-4 py-8 sm:px-6 lg:px-8 md:py-16">
          <div className="grid gap-12 md:grid-cols-12 md:gap-16">
            {/* Cover */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full md:col-span-6"
            >
              <MediaReveal className="relative aspect-square" direction="left">
                <Image
                  src={album.cover}
                  alt={album.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 320px"
                  className="object-cover"
                  priority
                />
              </MediaReveal>
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="self-center md:col-span-5 md:col-start-8"
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
              <h1 className="mb-6 font-[var(--font-editorial)] text-6xl font-normal leading-[.86] tracking-[-.055em] md:text-8xl lg:text-9xl">
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
                  <span className="text-sm text-[var(--color-gray-600)]">{locale === "fr" ? "Par" : "By"}</span>
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
                  {album.trackCount} {album.trackCount === 1 ? t("catalog.track") : t("catalog.tracks")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={16} />
                  {formatDuration(totalDuration)}
                </span>
                {album.releaseDate && (
                  <span>
                    {locale === "fr" ? "Sorti le" : "Released"} {new Date(album.releaseDate).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB")}
                  </span>
                )}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-8">
                {album.genres.map((genre) => (
                  <Link key={genre} href={`/search?genre=${genre.toLowerCase().replace(/\s+/g, "-")}`}>
                    <Tag variant="genre" clickable>
                      {localizeCatalogTerm(genre, locale)}
                    </Tag>
                  </Link>
                ))}
                {album.moods?.map((mood) => (
                  <Link key={mood} href={`/search?mood=${mood.toLowerCase().replace(/\s+/g, "-")}`}>
                    <Tag variant="mood" clickable>
                      {localizeCatalogTerm(mood, locale)}
                    </Tag>
                  </Link>
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" size="lg" onClick={handlePlayAll} disabled={tracks.length === 0}>
                  <Play size={20} className="mr-2 fill-white" />
                  {t("search.playSelection")}
                </Button>
                <Button variant="outline" size="lg">
                  <Heart size={20} className="mr-2" />
                  {t("account.favorites")}
                </Button>
                <Button variant="ghost" size="lg" aria-label={locale === "fr" ? "Partager l’album" : "Share album"}>
                  <Share2 size={20} />
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Tracks */}
        <section className="mx-auto max-w-[1500px] px-4 py-16 sm:px-6 lg:px-8 md:py-24">
          <h2 className="mb-8 font-[var(--font-editorial)] text-5xl font-normal tracking-[-.05em]">
            {t("catalog.tracks")}
          </h2>
          {tracks.length > 0 ? (
            <div className="border-y border-[var(--line)] py-2">
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
            </div>
          ) : (
            <p className="border-y border-[var(--line)] py-16 text-center text-[var(--text-muted)]">{locale === "fr" ? "Aucune piste disponible pour cet album." : "No tracks are available for this album."}</p>
          )}
        </section>

        {/* Similar Albums */}
        {similarAlbums.length > 0 && (
          <section className="mx-auto max-w-[1700px] px-4 py-16 sm:px-6 lg:px-8 md:py-28">
            <h2 className="mb-10 font-[var(--font-editorial)] text-5xl font-normal tracking-[-.05em]">
              {locale === "fr" ? "Albums similaires" : "Related albums"}
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
