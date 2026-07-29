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
import { ClipCard } from "@/components/editorial/ClipCard";
import { FavoriteButton } from "@/components/features/FavoriteButton";
import { formatDuration } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player-store";
import type { Album, ComposerCreditLink, Track } from "@/types";
import type { ComposerProfile } from "@/lib/editorial/contracts";
import type { EditorialVideo } from "@/lib/editorial/video-types";
import { useI18n } from "@/components/providers/I18nProvider";
import { formatParigoDate } from "@/lib/date-time";
import { localizeCatalogTerm } from "@/i18n/catalog-terms";
import { resizeArtworkSource } from "@/lib/image-loader";
import { Tooltip } from "@/components/ui/Tooltip";

interface AlbumDetailClientProps {
  data: {
    album: Album & { tracks: NonNullable<Album["tracks"]> };
    similarAlbums: Album[];
    composerCredits: ComposerCreditLink[];
    relatedClips: Array<{ clip: EditorialVideo; composers: Array<Pick<ComposerProfile, "slug" | "name">> }>;
  };
}

export function AlbumDetailClient({ data, initialTrackId }: AlbumDetailClientProps & { initialTrackId?: string }) {
  const { locale, t, localizedPath } = useI18n();
  const { setQueue, play } = usePlayerStore();
  const initialMainTrack = data.album.tracks.find((track) => track.id === initialTrackId);
  const initialAlternateTrack = data.album.tracks
    .flatMap((track) => track.alternateTracks ?? [])
    .find((track) => track.id === initialTrackId);
  const resolvedInitialTrackId = initialMainTrack?.id || initialAlternateTrack?.id;
  const [showAllVersions, setShowAllVersions] = useState(Boolean(initialAlternateTrack));
  const [trackSort, setTrackSort] = useState<"album" | "title-asc" | "title-desc">("album");

  const album = data.album;
  const albumCover = resizeArtworkSource(album.cover, 384);
  const mainTracks = data.album.tracks ?? [];
  const sortedMainTracks = trackSort === "album"
    ? mainTracks
    : [...mainTracks].sort((left, right) => left.title.localeCompare(right.title, locale, { sensitivity: "base" }) * (trackSort === "title-asc" ? 1 : -1));
  const trackItems: Array<{ track: Track; isAlternate: boolean; parentId?: string }> = sortedMainTracks.flatMap((track) => [
    { track, isAlternate: false },
    ...(showAllVersions
      ? (track.alternateTracks ?? []).map((alternateTrack) => ({
        track: alternateTrack,
        isAlternate: true,
        parentId: track.id,
      }))
      : []),
  ]);
  const tracks = trackItems.map((item) => item.track);
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
              <div className="album-cover-frame relative aspect-square">
                <Image
                  src={albumCover}
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
              <h1 className="mb-6 font-[var(--font-editorial)] text-5xl font-normal leading-[.9] tracking-[-.055em] md:text-7xl lg:text-8xl">
                {album.title}
              </h1>
              <div data-testid="album-label-meta" className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                {album.labelSlug ? (
                  <Link href={localizedPath(`/labels/${album.labelSlug}`)} className="font-medium text-[var(--color-primary)] hover:underline">
                    {album.label}
                  </Link>
                ) : (
                  <span className="font-medium text-[var(--color-primary)]">{album.label}</span>
                )}
                {album.code && <span className="album-reference-tag">{locale === "fr" ? "Réf." : "Ref."} {album.code}</span>}
              </div>
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
                    <span key={`${artist.slug}-${index}`}>
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
                    {locale === "fr" ? "Sorti le" : "Released"} {formatParigoDate(album.releaseDate, locale === "fr" ? "fr-FR" : "en-GB")}
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
              <div className="album-actions flex flex-wrap items-center gap-2">
                <Button variant="primary" size="lg" onClick={handlePlayAll} disabled={tracks.length === 0} className="album-actions__primary">
                  <Play size={18} className="mr-1 fill-current" />
                  {t("search.playSelection")}
                </Button>
                <FavoriteButton type="album" itemId={data.album.id} size="lg" appearance="editorial" className="album-actions__icon album-actions__favorite" />
                <Tooltip label={locale === "fr" ? "Partager l’album" : "Share album"}>
                  <button type="button" className="album-actions__icon" onClick={() => void handleShare()} aria-label={locale === "fr" ? "Partager l’album" : "Share album"}>
                    <Share2 size={17} />
                  </button>
                </Tooltip>
                <CueSheetButton compact title={album.title} trackIds={tracks.map((track) => track.id)} className="album-actions__icon" />
              </div>
            </div>
          </div>
        </section>

        {data.composerCredits.length > 0 && (
          <section className="mx-auto max-w-[1500px] px-4 pb-4 sm:px-6 lg:px-8">
            <div className="border-y border-[var(--line)] py-8">
              <p className="eyebrow mb-4 text-[var(--text-muted)]">
                {locale === "fr" ? "Compositeur" : "Composer"}
              </p>
              <div className="flex flex-wrap gap-2">
                {data.composerCredits.map((composer) => (
                  composer.slug ? (
                    <Link
                      key={composer.credit}
                      href={localizedPath(`/compositeurs/${composer.slug}`)}
                      className="border border-[var(--line-strong)] px-3 py-2 text-sm font-semibold transition hover:bg-[var(--surface-soft)]"
                    >
                      {composer.name}
                    </Link>
                  ) : (
                    <span key={composer.credit} className="border border-[var(--line)] px-3 py-2 text-sm text-[var(--text-muted)]">
                      {composer.credit}
                    </span>
                  )
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Tracks */}
        <section className="mx-auto max-w-[1500px] px-4 py-16 sm:px-6 lg:px-8 md:py-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-[var(--signal-strong)]">{album.label}</p>
              <h2 className="mt-3 font-[var(--font-editorial)] text-5xl font-normal tracking-[-.05em]">{t("catalog.tracks")}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={trackSort}
                onValueChange={setTrackSort}
                ariaLabel={locale === "fr" ? "Trier les pistes" : "Sort tracks"}
                className="min-w-[10.5rem]"
                options={[
                  { value: "album", label: locale === "fr" ? "Ordre de l’album" : "Album order" },
                  { value: "title-asc", label: "A–Z" },
                  { value: "title-desc", label: "Z–A" },
                ]}
              />
              <div className="inline-flex rounded-md border border-[var(--line)] p-1" role="group" aria-label={locale === "fr" ? "Versions des pistes" : "Track versions"}>
                <button type="button" aria-pressed={!showAllVersions} onClick={() => setShowAllVersions(false)} className={`min-h-10 rounded px-4 text-xs font-semibold ${!showAllVersions ? "bg-[var(--foreground)] text-[var(--background)]" : ""}`}>
                  {locale === "fr" ? "Pistes principales" : "Main tracks"}
                </button>
                <button type="button" aria-pressed={showAllVersions} onClick={() => setShowAllVersions(true)} className={`min-h-10 rounded px-4 text-xs font-semibold ${showAllVersions ? "bg-[var(--foreground)] text-[var(--background)]" : ""}`}>
                  {locale === "fr" ? "Toutes les versions" : "All versions"}
                </button>
              </div>
            </div>
          </div>
          {tracks.length > 0 ? (
            <div className="border-y border-[var(--line)] py-2">
              {trackItems.map(({ track, isAlternate, parentId }, index) => (
                <div
                  key={`${parentId ?? "main"}-${track.id}`}
                  data-track-kind={isAlternate ? "alternate" : "main"}
                  className={isAlternate ? "relative ml-5 border-l border-[color-mix(in_srgb,var(--signal)_58%,transparent)] pl-3 sm:ml-10 sm:pl-5" : undefined}
                >
                  {isAlternate && (
                    <span className="pointer-events-none absolute -left-px top-0 h-6 w-3 border-b border-[color-mix(in_srgb,var(--signal)_58%,transparent)]" aria-hidden="true" />
                  )}
                  <TrackRow
                    key={`${track.id}-${track.id === resolvedInitialTrackId ? "focused" : "regular"}`}
                    track={track}
                    album={albumWithTracks}
                    index={index}
                    showAlbumCover={false}
                    density={isAlternate ? "mid" : "full"}
                    composerCredits={data.composerCredits}
                    initialDetailsOpen={track.id === resolvedInitialTrackId}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="border-y border-[var(--line)] py-16 text-center text-[var(--text-muted)]">{locale === "fr" ? "Aucune piste disponible pour cet album." : "No tracks are available for this album."}</p>
          )}
        </section>

        {data.relatedClips.length > 0 && (
          <section className="mx-auto max-w-[1500px] px-4 py-16 sm:px-6 lg:px-8 md:py-24">
            <h2 className="mb-10 font-[var(--font-editorial)] text-5xl font-normal tracking-[-.05em]">Clips</h2>
            <div className="grid gap-5 md:grid-cols-2">
              {data.relatedClips.map(({ clip, composers }) => (
                <ClipCard key={clip.slug} clip={clip} composers={composers} locale={locale} />
              ))}
            </div>
          </section>
        )}

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
