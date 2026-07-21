"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Pause, ListPlus, ListEnd, ArrowUpRight, Info, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import type { Track, Album } from "@/types";
import { Tag } from "@/components/ui";
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
  const isCurrentTrack = currentTrack?.id === track.id;
  const isPlayingThis = isCurrentTrack && isPlaying;
  const [detailsOpen, setDetailsOpen] = useState(false);

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
        <button
          onClick={handlePlay}
          aria-label={isPlayingThis ? `${t("common.pause")} ${track.title}` : `${t("common.play")} ${track.title}`}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-all",
            isPlayingThis
              ? "bg-[var(--color-primary)] text-white"
              : "text-[var(--color-gray-400)] group-hover:text-[var(--color-black)] group-hover:bg-[var(--color-gray-100)]"
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
                : "text-[var(--color-black)]"
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
          <Tag key={genre} variant="genre" size="sm">
            {localizeCatalogTerm(genre, locale)}
          </Tag>
        ))}
        {track.moods.slice(0, 1).map((mood) => (
          <Tag key={mood} variant="mood" size="sm">
            {localizeCatalogTerm(mood, locale)}
          </Tag>
        ))}
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
        <FavoriteButton type="track" itemId={track.id} size="sm" showTooltip={false} />
        <button type="button" onClick={() => setDetailsOpen((value) => !value)} aria-expanded={detailsOpen} className={cn("flex h-10 w-10 items-center justify-center transition hover:bg-[var(--surface-soft)]", detailsOpen && "text-[var(--signal-strong)]")} aria-label={`${locale === "fr" ? "Informations sur la piste" : "Track information"} : ${track.title}`}><Info size={17} /></button>
        <div className="hidden lg:contents"><DownloadButton trackId={track.id} trackTitle={track.title} /><AddToPlaylistButton trackId={track.id} trackTitle={track.title} /><AddTagButton trackId={track.id} trackTitle={track.title} /><CueSheetButton compact title={track.title} trackIds={[track.id]} /></div>
        <button onClick={() => addToQueue(track)} className="hidden h-10 w-10 items-center justify-center transition-colors hover:bg-[var(--surface-soft)] xl:flex" aria-label={`${locale === "fr" ? "Ajouter à la file d’attente" : "Add to queue"} : ${track.title}`} title={locale === "fr" ? "File d’attente" : "Queue"}>
          <ListEnd size={17} className="text-[var(--color-gray-500)]" />
        </button>
        <button onClick={() => addToShortlist(track)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--signal-strong)]/45 text-[var(--signal-strong)] transition-colors hover:bg-[var(--signal-strong)] hover:text-white" aria-label={`${t("search.addShortlist")} : ${track.title}`} title={locale === "fr" ? "Ajouter à la sélection de travail" : "Add to working selection"}>
          <ListPlus size={17} />
        </button>
        <button type="button" onClick={() => void shareTrack()} className="hidden h-10 w-10 items-center justify-center transition-colors hover:bg-[var(--surface-soft)] xl:flex" aria-label={`${locale === "fr" ? "Partager" : "Share"} : ${track.title}`}><Share2 size={17} /></button>
        <Link href={`/contact?track=${encodeURIComponent(track.slug || track.id)}`} className="hidden h-10 w-10 items-center justify-center transition-colors hover:bg-[var(--surface-soft)] 2xl:flex" aria-label={`${locale === "fr" ? "Demander une licence" : "Request a licence"} : ${track.title}`} title={locale === "fr" ? "Demander une licence" : "Request a licence"}>
          <ArrowUpRight size={17} className="text-[var(--color-gray-500)]" />
        </Link>
      </div>
      </div>
      {detailsOpen && <TrackDetailsPanel track={track} />}
    </motion.article>
  );
}
