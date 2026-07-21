"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Pause, Check, ListPlus, ListEnd, ArrowUpRight, Info, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import type { Track, Album } from "@/types";
import { Tag, Tooltip } from "@/components/ui";
import { TrackWaveform } from "./TrackWaveform";
import { TrackDetailsPanel } from "./TrackDetailsPanel";
import { FavoriteButton } from "./FavoriteButton";
import { DownloadButton } from "./DownloadButton";
import { AddToPlaylistButton } from "./AddToPlaylistButton";
import { AddTagButton } from "./AddTagButton";
import { CueSheetButton } from "./CueSheetButton";
import { formatDuration, formatBPM, cn } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player-store";
import { useShortlistStore } from "@/stores/shortlist-store";
import { useI18n } from "@/components/providers/I18nProvider";
import { localizeCatalogTerm } from "@/i18n/catalog-terms";

interface TrackRowProps {
  track: Track;
  album?: Album;
  index: number;
  showAlbumCover?: boolean;
  showWaveform?: boolean;
  queue?: Track[];
  compact?: boolean;
  density?: "full" | "mid" | "light";
}

export function TrackRow({
  track,
  album,
  index,
  showAlbumCover = true,
  showWaveform = true,
  queue,
  compact = false,
  density = compact ? "mid" : "full",
}: TrackRowProps) {
  const { locale, t } = useI18n();
  const { currentTrack, isPlaying, progress, duration, play, pause, resume, setQueue, addToQueue } = usePlayerStore();
  const addToShortlist = useShortlistStore((state) => state.add);
  const removeFromShortlist = useShortlistStore((state) => state.remove);
  const isShortlisted = useShortlistStore((state) => state.items.some((item) => item.track.id === track.id));
  const isCurrentTrack = currentTrack?.id === track.id;
  const isPlayingThis = isCurrentTrack && isPlaying;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const displayedTerms = [track.genres[0], track.moods[0]].filter(Boolean) as string[];
  const additionalTerms = [...new Set([
    ...track.genres.slice(1),
    ...track.moods.slice(1),
    ...(track.instruments ?? []),
    ...(track.tags ?? []),
    ...(track.keywords ?? []),
    ...(track.musicFor ?? []),
  ].filter((term) => term && !displayedTerms.some((displayed) => displayed.toLocaleLowerCase() === term.toLocaleLowerCase())))];
  const additionalTermsLabel = additionalTerms.slice(0, 12).map((term) => localizeCatalogTerm(term, locale)).join(" · ");

  // Calculate progress percentage for waveform
  const progressPercent = isCurrentTrack && duration > 0 ? (progress / duration) * 100 : 0;

  const handlePlay = () => {
    if (isCurrentTrack) {
      if (isPlaying) {
        pause();
      } else {
        resume();
      }
    } else {
      if (queue?.length) {
        const trackIndex = queue.findIndex((item) => item.id === track.id);
        setQueue(queue, trackIndex >= 0 ? trackIndex : 0);
      } else if (album?.tracks) {
        const trackIndex = album.tracks.findIndex((t) => t.id === track.id);
        setQueue(album.tracks, trackIndex);
      }
      play(track);
    }
  };
  const shareTrack = async () => {
    const url = `${window.location.origin}/albums/${album?.slug || track.albumId}?track=${encodeURIComponent(track.id)}`;
    if (navigator.share) await navigator.share({ title: track.title, text: track.description, url }).catch(() => undefined);
    else await navigator.clipboard.writeText(url);
  };

  return (
    <motion.article
      className={cn("group border-b border-[var(--line)] transition-all duration-150 last:border-b-0", isCurrentTrack ? "bg-[var(--color-primary-light)]" : "hover:bg-black/[.04]")}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className={cn("flex items-center gap-2 px-2 md:gap-3 md:px-3", density === "full" ? "py-3.5" : density === "mid" ? "py-2.5" : "py-1.5")}>
      {/* Index / Play button */}
      <div className="w-8 flex items-center justify-center flex-shrink-0">
        <Tooltip label={isPlayingThis ? t("common.pause") : t("common.play")}>
        <button
          onClick={handlePlay}
          aria-label={isPlayingThis ? `${t("common.pause")} ${track.title}` : `${t("common.play")} ${track.title}`}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-all",
            isPlayingThis
              ? "bg-[var(--color-primary)] text-white"
              : "text-[var(--text-muted)] group-hover:bg-[var(--surface-soft)] group-hover:text-[var(--foreground)]"
          )}
        >
          {isPlayingThis ? (
            <Pause size={14} className="fill-current" />
          ) : (
            <span className="group-hover:hidden text-sm font-mono">
              {String(index + 1).padStart(2, "0")}
            </span>
          )}
          {!isPlayingThis && (
            <Play
              size={14}
              className="hidden group-hover:block fill-current ml-0.5"
            />
          )}
        </button>
        </Tooltip>
      </div>

      {/* Album cover */}
      {showAlbumCover && album && density !== "light" && (
        <div className={cn("relative flex-shrink-0 overflow-hidden border border-[var(--line)]", density === "full" ? "h-16 w-16" : "h-10 w-10")}>
          <Image
            src={album.cover}
            alt={album.title}
            fill
            sizes={density === "full" ? "64px" : "40px"}
            className="object-cover"
          />
        </div>
      )}

      {/* Track info + Waveform */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setDetailsOpen((value) => !value)} aria-expanded={detailsOpen} className="min-w-0 text-left">
          <p
            className={cn(
              "font-medium truncate",
              isCurrentTrack
                ? "text-[var(--color-primary-dark)]"
                : "text-[var(--foreground)]"
            )}
          >
            {track.title}
          </p></button>
          {album && (
            <Link href={`/albums/${album.slug || album.id}`} className="hidden truncate text-sm text-[var(--color-gray-400)] transition hover:text-[var(--foreground)] sm:inline">
              — {album.title}
            </Link>
          )}
        </div>

        {/* Waveform */}
        {showWaveform && density !== "light" && (
          <div className="w-full">
            <TrackWaveform
              trackId={track.id}
              initialData={track.waveform}
              progress={progressPercent}
              height={density === "full" ? 28 : 20}
              className="opacity-80 group-hover:opacity-100 transition-opacity"
            />
          </div>
        )}
        {density === "full" && track.description && <p className="line-clamp-2 max-w-5xl text-xs leading-5 text-[var(--text-muted)]">{track.description}</p>}
      </div>

      {/* Tags - Hidden on small screens */}
      {density === "full" && <div className="hidden xl:flex items-center gap-1 flex-shrink-0">
        {track.genres.slice(0, 1).map((genre) => (
          <Tooltip key={genre} label={`${locale === "fr" ? "Genre principal" : "Primary genre"} · ${localizeCatalogTerm(genre, locale)}`}>
            <Tag variant="genre" size="sm">{localizeCatalogTerm(genre, locale)}</Tag>
          </Tooltip>
        ))}
        {track.moods.slice(0, 1).map((mood) => (
          <Tooltip key={mood} label={`${locale === "fr" ? "Humeur principale" : "Primary mood"} · ${localizeCatalogTerm(mood, locale)}`}>
            <Tag variant="mood" size="sm">{localizeCatalogTerm(mood, locale)}</Tag>
          </Tooltip>
        ))}
        {additionalTerms.length > 0 && <Tooltip label={`${locale === "fr" ? "Autres tags" : "Other tags"} · ${additionalTermsLabel}${additionalTerms.length > 12 ? "…" : ""}`}><button type="button" onClick={() => setDetailsOpen(true)} className="inline-flex min-h-7 items-center rounded-full border border-dashed border-[var(--line-strong)] px-2 text-[.65rem] font-semibold text-[var(--text-muted)] transition hover:border-[var(--signal-strong)] hover:text-[var(--signal-strong)]" aria-label={`${locale === "fr" ? "Voir tous les tags" : "View all tags"} : ${track.title}`}>+{additionalTerms.length}</button></Tooltip>}
      </div>}

      {/* BPM */}
      <div className="hidden md:block w-16 text-right flex-shrink-0">
        <span className="text-sm font-mono text-[var(--color-gray-400)]">
          {formatBPM(track.bpm)}
        </span>
      </div>

      {/* Duration */}
      <div className="w-12 text-right flex-shrink-0">
        <span className="text-sm font-mono text-[var(--color-gray-400)]">
          {formatDuration(track.duration)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-0.5">
        <FavoriteButton type="track" itemId={track.id} size="sm" />
        <Tooltip label={locale === "fr" ? "Informations sur la piste" : "Track information"}><button type="button" onClick={() => setDetailsOpen((value) => !value)} aria-expanded={detailsOpen} className={cn("flex h-10 w-10 items-center justify-center transition hover:bg-[var(--surface-soft)]", detailsOpen && "text-[var(--signal-strong)]")} aria-label={`${locale === "fr" ? "Informations sur la piste" : "Track information"} : ${track.title}`}><Info size={17} /></button></Tooltip>
        <div className="hidden lg:contents"><DownloadButton trackId={track.id} trackTitle={track.title} /><AddToPlaylistButton trackId={track.id} trackTitle={track.title} /><AddTagButton trackId={track.id} trackTitle={track.title} /><CueSheetButton compact title={track.title} trackIds={[track.id]} /></div>
        <Tooltip label={locale === "fr" ? "Ajouter à la file d’attente" : "Add to queue"} className="hidden xl:inline-flex"><button onClick={() => addToQueue(track)} className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-[var(--surface-soft)]" aria-label={`${locale === "fr" ? "Ajouter à la file d’attente" : "Add to queue"} : ${track.title}`}>
          <ListEnd size={17} className="text-[var(--color-gray-500)]" />
        </button></Tooltip>
        <Tooltip label={isShortlisted ? (locale === "fr" ? "Déjà dans la sélection — retirer" : "Already selected — remove") : (locale === "fr" ? "Ajouter à la sélection" : "Add to selection")}><button onClick={() => isShortlisted ? removeFromShortlist(track.id) : addToShortlist(track)} aria-pressed={isShortlisted} className={cn("flex h-10 w-10 items-center justify-center rounded-full border transition-colors", isShortlisted ? "border-[var(--signal-strong)] bg-[var(--signal-strong)] text-white shadow-[0_0_0_3px_color-mix(in_srgb,var(--signal)_16%,transparent)]" : "border-[var(--signal-strong)]/45 text-[var(--signal-strong)] hover:bg-[var(--signal-strong)] hover:text-white")} aria-label={`${isShortlisted ? t("search.removeShortlist") : t("search.addShortlist")} : ${track.title}`}>
          {isShortlisted ? <Check size={17} /> : <ListPlus size={17} />}
        </button></Tooltip>
        <Tooltip label={locale === "fr" ? "Partager" : "Share"} className="hidden xl:inline-flex"><button type="button" onClick={() => void shareTrack()} className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-[var(--surface-soft)]" aria-label={`${locale === "fr" ? "Partager" : "Share"} : ${track.title}`}><Share2 size={17} /></button></Tooltip>
        <Tooltip label={locale === "fr" ? "Demander une licence" : "Request a licence"} className="hidden 2xl:inline-flex"><Link href={`/contact?track=${encodeURIComponent(track.slug || track.id)}`} className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-[var(--surface-soft)]" aria-label={`${locale === "fr" ? "Demander une licence" : "Request a licence"} : ${track.title}`}>
          <ArrowUpRight size={17} className="text-[var(--color-gray-500)]" />
        </Link></Tooltip>
      </div>
      </div>
      {detailsOpen && <TrackDetailsPanel track={track} />}
    </motion.article>
  );
}
