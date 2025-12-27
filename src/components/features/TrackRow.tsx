"use client";

import Image from "next/image";
import { Play, Pause, Heart, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import type { Track, Album } from "@/types";
import { Tag } from "@/components/ui";
import { Waveform } from "./Waveform";
import { formatDuration, formatBPM, cn } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player-store";

interface TrackRowProps {
  track: Track;
  album?: Album;
  index: number;
  showAlbumCover?: boolean;
  showWaveform?: boolean;
}

export function TrackRow({
  track,
  album,
  index,
  showAlbumCover = true,
  showWaveform = true,
}: TrackRowProps) {
  const { currentTrack, isPlaying, progress, duration, play, pause, resume, setQueue } = usePlayerStore();
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
      if (album) {
        const trackIndex = album.tracks.findIndex((t) => t.id === track.id);
        setQueue(album.tracks, trackIndex);
      }
      play(track);
    }
  };

  return (
    <motion.div
      className={cn(
        "group flex items-center gap-3 p-3 rounded-[var(--radius-sm)] transition-all duration-150",
        isCurrentTrack
          ? "bg-[var(--color-primary-light)] border-2 border-[var(--color-primary)]"
          : "hover:bg-[var(--color-gray-100)] border-2 border-transparent"
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {/* Index / Play button */}
      <div className="w-8 flex items-center justify-center flex-shrink-0">
        <button
          onClick={handlePlay}
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
        <div className="w-10 h-10 relative rounded-[var(--radius-sm)] overflow-hidden border border-[var(--color-gray-100)] flex-shrink-0">
          <Image
            src={album.cover}
            alt={album.title}
            fill
            sizes="40px"
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
            <span className="text-sm text-[var(--color-gray-400)] truncate hidden sm:inline">
              — {album.title}
            </span>
          )}
        </div>

        {/* Waveform */}
        {showWaveform && (
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
            {genre}
          </Tag>
        ))}
        {track.moods.slice(0, 1).map((mood) => (
          <Tag key={mood} variant="mood" size="sm">
            {mood}
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
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button className="p-2 rounded-full hover:bg-[var(--color-gray-100)] transition-colors">
          <Heart size={16} className="text-[var(--color-gray-400)]" />
        </button>
        <button className="p-2 rounded-full hover:bg-[var(--color-gray-100)] transition-colors">
          <MoreHorizontal size={16} className="text-[var(--color-gray-400)]" />
        </button>
      </div>
    </motion.div>
  );
}
