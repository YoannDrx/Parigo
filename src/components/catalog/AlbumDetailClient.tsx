"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Share2, ArrowLeft, Clock, Music } from "lucide-react";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Tag } from "@/components/ui/Tag";
import { TrackRow } from "@/components/features/TrackRow";
import { AlbumCard } from "@/components/features/AlbumCard";
import { CueSheetButton } from "@/components/features/CueSheetButton";
import { FavoriteButton } from "@/components/features/FavoriteButton";
import { formatDuration } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player-store";
import type { Album } from "@/types";
import { useI18n } from "@/components/providers/I18nProvider";
import { localizeCatalogTerm } from "@/i18n/catalog-terms";

interface AlbumDetailClientProps {
  data: {
    album: Album & { tracks: NonNullable<Album["tracks"]> };
    similarAlbums: Album[];
  };
}

export function AlbumDetailClient({ data }: AlbumDetailClientProps) {
  const { locale, t, localizedPath } = useI18n();
  const { setQueue, play } = usePlayerStore();
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [trackSort, setTrackSort] = useState<"album" | "title-asc" | "title-desc">("album");

  const album = data.album;
  const mainTracks = data.album.tracks ?? [];
  const unsortedTracks = showAllVersions
    ? mainTracks.flatMap((track) => [track, ...(track.alternateTracks ?? [])])
    : mainTracks;
  const tracks = trackSort === "album"
    ? unsortedTracks
    : [...unsortedTracks].sort((left, right) => left.title.localeCompare(right.title, locale, { sensitivity: "base" }) * (trackSort === "title-asc" ? 1 : -1));
  const similarAlbums = data.similarAlbums ?? [];

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

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: album.title, text: album.description || undefined, url }).catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 pb-24 pt-[70px]">
        {/* Back Link */}
        <div className="mx-auto max-w-[1700px] px-4 py-6 sm:px-6 lg:px-8">
          <Link
            href={localizedPath("/albums")}
            className="inline-flex items-center gap-2 text-[var(--text-muted)] transition-colors hover:text-[var(--foreground)]"
          >
            <ArrowLeft size={18} />
            {t("common.back")} · {t("common.albums")}
          </Link>
        </div>

        {/* Album Header */}
        <section className="mx-auto max-w-[1700px] px-4 py-8 sm:px-6 lg:px-8 md:py-16">
          <div className="grid gap-10 md:grid-cols-12 md:items-start md:gap-12">
            {/* Cover */}
            <div className="w-full max-w-[520px] md:col-span-4">
              <div className="relative aspect-square overflow-hidden">
                <Image
                  src={album.cover}
                  alt={album.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 520px"
                  className="object-contain"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
            </div>

            {/* Info */}
            <div className="self-center md:col-span-7 md:col-start-6">
              {album.labelSlug ? (
                <Link href={localizedPath(`/labels/${album.labelSlug}`)}>
                  <p className="text-sm font-medium text-[var(--color-primary)] mb-2 hover:underline">
                    {album.label}
                  </p>
                </Link>
              ) : (
                <p className="text-sm font-medium text-[var(--color-primary)] mb-2">
                  {album.label}
                </p>
              )}
              {album.code && <p className="mb-3 font-mono text-[.65rem] uppercase tracking-[.14em] text-[var(--text-muted)]">{album.code}</p>}
              <h1 className="mb-6 font-[var(--font-editorial)] text-5xl font-normal leading-[.9] tracking-[-.055em] md:text-7xl lg:text-8xl">
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
                      <span className="text-sm font-medium text-[var(--foreground)]">{artist.name}</span>
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
                  <Link key={genre} href={localizedPath(`/search?genre=${genre.toLowerCase().replace(/\s+/g, "-")}`)}>
                    <Tag variant="genre" clickable>
                      {localizeCatalogTerm(genre, locale)}
                    </Tag>
                  </Link>
                ))}
                {album.moods?.map((mood) => (
                  <Link key={mood} href={localizedPath(`/search?mood=${mood.toLowerCase().replace(/\s+/g, "-")}`)}>
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
                <div className="flex items-center gap-2 border border-[var(--line)] px-3">
                  <FavoriteButton type="album" itemId={data.album.id} size="md" showTooltip={false} />
                  <span className="text-sm">{t("account.favorites")}</span>
                </div>
                <Button variant="ghost" size="lg" onClick={() => void handleShare()} aria-label={locale === "fr" ? "Partager l’album" : "Share album"}>
                  <Share2 size={20} />
                </Button>
                <CueSheetButton title={album.title} trackIds={tracks.map((track) => track.id)} />
              </div>
            </div>
          </div>
        </section>

        {/* Tracks */}
        <section className="mx-auto max-w-[1500px] px-4 py-16 sm:px-6 lg:px-8 md:py-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow text-[var(--signal-strong)]">{album.code || album.label}</p><h2 className="mt-3 font-[var(--font-editorial)] text-5xl font-normal tracking-[-.05em]">{t("catalog.tracks")}</h2></div><div className="flex flex-wrap items-center gap-2"><Select value={trackSort} onValueChange={setTrackSort} ariaLabel={locale === "fr" ? "Trier les pistes" : "Sort tracks"} className="min-w-[10.5rem]" options={[{ value: "album", label: locale === "fr" ? "Ordre de l’album" : "Album order" }, { value: "title-asc", label: "A–Z" }, { value: "title-desc", label: "Z–A" }]} /><div className="inline-flex rounded-md border border-[var(--line)] p-1" role="group" aria-label={locale === "fr" ? "Versions des pistes" : "Track versions"}><button type="button" aria-pressed={!showAllVersions} onClick={() => setShowAllVersions(false)} className={`min-h-10 rounded px-4 text-xs font-semibold ${!showAllVersions ? "bg-[var(--foreground)] text-[var(--background)]" : ""}`}>{locale === "fr" ? "Pistes principales" : "Main tracks"}</button><button type="button" aria-pressed={showAllVersions} onClick={() => setShowAllVersions(true)} className={`min-h-10 rounded px-4 text-xs font-semibold ${showAllVersions ? "bg-[var(--foreground)] text-[var(--background)]" : ""}`}>{locale === "fr" ? "Toutes les versions" : "All versions"}</button></div></div></div>
          {tracks.length > 0 ? (
            <div className="border-y border-[var(--line)] py-2">
              {tracks.map((track, index) => (
                <div key={track.id}>
                  <TrackRow
                    track={track}
                    album={albumWithTracks}
                    index={index}
                    showAlbumCover={false}
                  />
                </div>
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
              {locale === "fr" ? "Dans le même univers" : "In the same universe"}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {similarAlbums.map((similarAlbum) => (
                <div key={similarAlbum.id}>
                  <AlbumCard album={similarAlbum} />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
