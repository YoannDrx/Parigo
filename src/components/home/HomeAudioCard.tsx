"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { useI18n } from "@/components/providers/I18nProvider";

interface HomeAudioCardProps {
  href: string;
  image: string;
  title: string;
  eyebrow: string;
  meta: string;
  playing: boolean;
  active: boolean;
  loading: boolean;
  onPlay: () => void;
}

export function HomeAudioCard({
  href,
  image,
  title,
  eyebrow,
  meta,
  playing,
  active,
  loading,
  onPlay,
}: HomeAudioCardProps) {
  const { locale } = useI18n();
  const playLabel = loading
    ? (locale === "fr" ? `Chargement de ${title}` : `Loading ${title}`)
    : playing
      ? (locale === "fr" ? `Mettre en pause ${title}` : `Pause ${title}`)
      : active
        ? (locale === "fr" ? `Reprendre ${title}` : `Resume ${title}`)
        : (locale === "fr" ? `Lire ${title}` : `Play ${title}`);
  const detailLabel = locale === "fr" ? `Voir le détail de ${title}` : `View ${title} details`;

  return (
    <article className="home-rail-card home-audio-card group relative snap-start">
      <div className="home-rail-card__media relative aspect-square overflow-hidden rounded-[.8rem] bg-[var(--surface-soft)]">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width:640px) 78vw, 25vw"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.035] group-focus-within:scale-[1.035]"
        />
        <div className="home-audio-card__actions absolute left-3 top-3 z-[4] flex gap-2">
          <button
            type="button"
            onClick={onPlay}
            disabled={loading}
            className="home-release-play home-audio-card__action media-overlay-action media-overlay-action--play grid h-11 w-11 place-items-center rounded-full border border-white/55 text-white transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait"
            aria-label={playLabel}
          >
            {loading
              ? <ParigoLoader size="icon" label={playLabel} />
              : playing
                ? <Pause size={17} fill="currentColor" />
                : <Play size={17} className="ml-0.5" fill="currentColor" />}
          </button>
          <Link
            href={href}
            prefetch={false}
            className="home-audio-card__action media-overlay-action media-overlay-action--detail grid h-11 w-11 place-items-center rounded-full border border-white/55 !text-white transition hover:scale-105 hover:!text-[#151815] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={detailLabel}
          >
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
      <div className="flex min-h-24 items-end justify-between gap-4 px-1 pb-1 pt-5">
        <div className="min-w-0">
          <p className="truncate font-mono text-[.54rem] uppercase tracking-[.12em] text-[var(--signal-strong)]">{eyebrow}</p>
          <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-[1.05] tracking-[-.025em]">{title}</h3>
        </div>
        <p className="shrink-0 font-mono text-[.55rem] text-[var(--text-muted)]">{meta}</p>
      </div>
      <Link
        href={href}
        prefetch={false}
        className="home-audio-card__card-link absolute inset-0 z-[2] rounded-[1.1rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
        aria-label={detailLabel}
      />
    </article>
  );
}
