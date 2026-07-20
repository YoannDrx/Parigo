"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Pause, ListPlus, ListEnd, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import type { Track, Album } from "@/types";
import { Tag } from "@/components/ui";
import { Waveform } from "./Waveform";
import { FavoriteButton } from "./FavoriteButton";
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
}

export function TrackRow({
  track,
  album,
  index,
  showAlbumCover = true,
  showWaveform = true,
  queue,
  compact = false,
}: TrackRowProps) {
  const { locale, t } = useI18n();
  const { currentTrack, isPlaying, progress, duration, play, pause, resume, setQueue, addToQueue } = usePlayerStore();
  const addToShortlist = useShortlistStore((state) => state.add);
  const isCurrentTrack = currentTrack?.id === track.id;
  const isPlayingThis = isCurrentTrack && isPlaying;

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

  return (
    <motion.div
      className={cn(
        "group flex items-center gap-3 border-b border-[var(--line)] px-2 transition-all duration-150 last:border-b-0 md:px-3",
        compact ? "py-2" : "py-3.5",
        isCurrentTrack
          ? "bg-[var(--color-primary-light)]"
          : "hover:bg-black/[.04]"
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
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
      {showAlbumCover && album && (
        <div className={cn("relative flex-shrink-0 overflow-hidden border border-[var(--line)]", compact ? "h-9 w-9" : "h-12 w-12")}>
          <Image
            src={album.cover}
            alt={album.title}
            fill
            sizes={compact ? "36px" : "48px"}
            className="object-cover"
          />
        </div>
      )}

      {/* Track info + Waveform */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "font-medium truncate",
              isCurrentTrack
                ? "text-[var(--color-primary-dark)]"
                : "text-[var(--color-black)]"
            )}
          >
            {track.title}
          </p>
          {album && (
            <Link href={`/albums/${album.slug || album.id}`} className="hidden truncate text-sm text-[var(--color-gray-400)] transition hover:text-[var(--foreground)] sm:inline">
              — {album.title}
            </Link>
          )}
        </div>

        {/* Waveform */}
        {showWaveform && !compact && (
          <div className="w-full">
            <Waveform
              data={track.waveform}
              progress={progressPercent}
              height={24}
              waveColor={isCurrentTrack ? "var(--color-primary-light)" : "var(--color-gray-100)"}
              progressColor="var(--color-primary)"
              className="opacity-80 group-hover:opacity-100 transition-opacity"
            />
          </div>
        )}
      </div>

      {/* Tags - Hidden on small screens */}
      <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
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
      </div>

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
      <div className="flex items-center gap-1 opacity-100 transition-opacity flex-shrink-0 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
        <FavoriteButton type="track" itemId={track.id} size="sm" showTooltip={false} />
        <button onClick={() => addToQueue(track)} className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-[var(--surface-soft)]" aria-label={`${locale === "fr" ? "Ajouter à la file d’attente" : "Add to queue"} : ${track.title}`} title={locale === "fr" ? "File d’attente" : "Queue"}>
          <ListEnd size={17} className="text-[var(--color-gray-500)]" />
        </button>
        <button onClick={() => addToShortlist(track)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--color-gray-100)] transition-colors" aria-label={`${t("search.addShortlist")} : ${track.title}`}>
          <ListPlus size={17} className="text-[var(--color-gray-500)]" />
        </button>
        <Link href={`/contact?track=${encodeURIComponent(track.slug || track.id)}`} className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-[var(--surface-soft)]" aria-label={`${locale === "fr" ? "Demander une licence" : "Request a licence"} : ${track.title}`} title={locale === "fr" ? "Demander une licence" : "Request a licence"}>
          <ArrowUpRight size={17} className="text-[var(--color-gray-500)]" />
        </Link>
      </div>
    </motion.div>
  );
}
