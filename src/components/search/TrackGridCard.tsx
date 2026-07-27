"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, ListPlus, Pause, Play } from "lucide-react";
import { FavoriteButton } from "@/components/features/FavoriteButton";
import { TrackWaveform } from "@/components/features/TrackWaveform";
import { useI18n } from "@/components/providers/I18nProvider";
import { localizeCatalogTerm } from "@/i18n/catalog-terms";
import { cn, formatBPM, formatDuration } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player-store";
import { useShortlistStore } from "@/stores/shortlist-store";
import type { Album, Track } from "@/types";

export function TrackGridCard({
  track,
  album,
  queue,
  index,
}: {
  track: Track;
  album: Album;
  queue: Track[];
  index: number;
}) {
  const { locale, t, localizedPath } = useI18n();
  const { currentTrack, isPlaying, progress, duration, play, pause, resume, setQueue } = usePlayerStore();
  const addToShortlist = useShortlistStore((state) => state.add);
  const removeFromShortlist = useShortlistStore((state) => state.remove);
  const isShortlisted = useShortlistStore((state) => state.items.some((item) => item.track.id === track.id));
  const isCurrent = currentTrack?.id === track.id;
  const isPlayingThis = isCurrent && isPlaying;
  const progressPercent = isCurrent && duration > 0 ? progress / duration * 100 : 0;
  const primaryTerms = [...track.genres, ...track.moods].slice(0, 2);

  const handlePlay = () => {
    if (isCurrent) {
      if (isPlaying) pause();
      else resume();
      return;
    }
    const queueIndex = queue.findIndex((item) => item.id === track.id);
    setQueue(queue, queueIndex >= 0 ? queueIndex : 0);
    play(track);
  };

  return (
    <article
      data-state={isCurrent ? "playing" : "idle"}
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
      className={cn(
        "search-track-card parigo-frame group relative min-w-0 animate-[fade-in_.3s_ease-out_both] overflow-hidden border bg-[var(--surface)]",
        isCurrent ? "border-[var(--signal-strong)]" : "border-[var(--line)]",
      )}
    >
      <div className="relative aspect-square overflow-hidden border-b border-[var(--line)] bg-[var(--surface-soft)]">
        <Image
          src={album.cover}
          alt={album.title}
          fill
          sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"
          className="object-cover transition duration-700 ease-out group-hover:scale-[1.045]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/76 via-black/5 to-transparent opacity-75 transition duration-500 group-hover:opacity-90" />
        <button
          type="button"
          onClick={handlePlay}
          aria-label={`${isPlayingThis ? t("common.pause") : t("common.play")} ${track.title}`}
          className="absolute left-4 top-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/62 bg-black/34 text-white backdrop-blur-md transition duration-300 hover:rotate-[-7deg] hover:border-[var(--signal)] hover:bg-[var(--signal)] focus-visible:bg-[var(--signal)]"
        >
          {isPlayingThis ? <Pause size={17} fill="currentColor" /> : <Play size={17} className="ml-0.5" fill="currentColor" />}
        </button>
        <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 text-white">
          <div className="min-w-0">
            <p className="truncate font-mono text-[.55rem] uppercase tracking-[.12em] text-white/68">{album.title}</p>
            <h2 className="mt-2 line-clamp-2 text-xl font-semibold leading-[1.02] tracking-[-.035em] text-white">{track.title}</h2>
          </div>
          <FavoriteButton type="track" itemId={track.id} size="sm" />
        </div>
      </div>
      <div className="p-4">
        <TrackWaveform
          trackId={track.id}
          initialData={track.waveform}
          progress={progressPercent}
          height={28}
          className="opacity-72 transition-opacity group-hover:opacity-100"
        />
        <div className="mt-4 flex items-center justify-between gap-3 font-mono text-[.62rem] text-[var(--text-muted)]">
          <span>{formatBPM(track.bpm)}</span>
          <span>{formatDuration(track.duration)}</span>
        </div>
        {track.description ? <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-[var(--text-muted)]">{track.description}</p> : <div className="min-h-10" />}
        <div className="mt-4 flex min-h-8 items-center justify-between gap-3 border-t border-[var(--line)] pt-3">
          <div className="flex min-w-0 gap-1.5">
            {primaryTerms.map((term) => (
              <span key={term} className="truncate border border-[var(--line)] px-2 py-1 text-[.58rem] text-[var(--text-muted)]">
                {localizeCatalogTerm(term, locale)}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => isShortlisted ? removeFromShortlist(track.id) : addToShortlist(track)}
            aria-pressed={isShortlisted}
            aria-label={`${isShortlisted ? t("search.removeShortlist") : t("search.addShortlist")} : ${track.title}`}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center border transition",
              isShortlisted
                ? "border-[var(--signal-strong)] bg-[var(--signal-strong)] text-white"
                : "border-[var(--line-strong)] text-[var(--signal-strong)] hover:border-[var(--signal-strong)]",
            )}
          >
            {isShortlisted ? <Check size={15} /> : <ListPlus size={15} />}
          </button>
        </div>
        <Link
          href={localizedPath(`/albums/${album.slug || album.id}?track=${encodeURIComponent(track.id)}`)}
          className="mt-3 inline-flex min-h-9 items-center border-b border-[var(--line)] text-xs font-semibold transition hover:border-[var(--signal-strong)] hover:text-[var(--signal-strong)]"
        >
          {locale === "fr" ? "Voir la piste" : "View track"}
        </Link>
      </div>
      <span aria-hidden="true" className="search-track-card__corner search-track-card__corner--top" />
      <span aria-hidden="true" className="search-track-card__corner search-track-card__corner--bottom" />
    </article>
  );
}
