"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClipPlaybackDescriptor } from "@/lib/editorial/video-types";
import { ClipPlaybackAnchor } from "@/components/media/ClipPlaybackAnchor";
import { useClipPlayback } from "@/components/providers/ClipPlaybackProvider";
import { useI18n } from "@/components/providers/I18nProvider";

export function ParigoVideoCard({
  clip,
  href,
  image,
  title,
  eyebrow,
  detail,
  sizes = "(max-width: 1024px) 100vw, 50vw",
  className,
  headingLevel = "h2",
}: {
  clip: ClipPlaybackDescriptor;
  href: string;
  image: string;
  title: string;
  eyebrow: string;
  detail?: string;
  sizes?: string;
  className?: string;
  headingLevel?: "h2" | "h3";
}) {
  const { locale } = useI18n();
  const { activeClip, status, toggleClip } = useClipPlayback();
  const Heading = headingLevel;
  const active = activeClip?.slug === clip.slug;
  const playing = active && (status === "playing" || status === "loading");
  const detailLabel = locale === "fr" ? `Voir le détail de ${title}` : `View ${title} details`;
  return (
    <article className={cn("home-sync-card editorial-video-card parigo-video-card group block min-w-0 max-md:before:!hidden max-md:after:!hidden", className)}>
      <ClipPlaybackAnchor
        clip={clip}
        className="home-sync-card__frame parigo-video-card__frame aspect-video min-w-0 overflow-hidden bg-[#0b0e0b] max-md:!rounded-[.8rem] max-md:after:!hidden"
      >
        <Image
          src={image}
          alt={title}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-700 md:group-hover:scale-[1.025] md:group-focus-within:scale-[1.025]"
        />
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] -translate-x-[140%] bg-[linear-gradient(115deg,transparent_34%,rgba(255,255,255,.34)_48%,transparent_62%)] transition-transform duration-700 group-hover:translate-x-[140%] md:hidden" />
        <div className="absolute inset-0 hidden bg-gradient-to-t from-black/84 via-black/8 to-black/10 md:block" />
        <div className="parigo-video-card__actions absolute left-3 top-3 z-[4] flex gap-2 sm:left-4 sm:top-4">
          {clip.youtubeId ? (
            <button
              type="button"
              onClick={() => toggleClip(clip)}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-black/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.2),0_8px_24px_rgba(0,0,0,.18)] backdrop-blur-[7px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:border-white/45 md:bg-black/55 md:shadow-xl md:backdrop-blur-md md:hover:scale-105 md:hover:bg-[var(--signal)]"
              aria-label={playing
                ? (locale === "fr" ? `Mettre en pause ${title}` : `Pause ${title}`)
                : (locale === "fr" ? `Lire ${title}` : `Play ${title}`)}
            >
              {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} className="ml-0.5" fill="currentColor" />}
            </button>
          ) : null}
          <Link
            href={href}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-black/20 !text-white shadow-[inset_0_1px_0_rgba(255,255,255,.2),0_8px_24px_rgba(0,0,0,.18)] backdrop-blur-[7px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:border-white/45 md:bg-black/55 md:shadow-xl md:backdrop-blur-md md:hover:scale-105 md:hover:bg-white md:hover:!text-[#151815]"
            aria-label={detailLabel}
          >
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="parigo-video-card__caption absolute inset-x-0 bottom-0 z-[2] hidden min-w-0 p-4 text-white sm:p-6 md:block">
          <p className="truncate font-mono text-[.54rem] uppercase tracking-[.13em] text-white/68">{eyebrow}</p>
          <Heading className="mt-1.5 line-clamp-2 text-2xl font-semibold tracking-[-.045em] sm:text-3xl">
            <Link href={href} className="relative z-[3] outline-none after:absolute after:-inset-x-1 after:-inset-y-0.5 focus-visible:after:ring-2 focus-visible:after:ring-white">
              {title}
            </Link>
          </Heading>
          {detail && <p className="mt-2 line-clamp-1 text-sm text-white/72">{detail}</p>}
        </div>
        <span aria-hidden="true" className="parigo-video-card__ring max-md:!hidden" />
      </ClipPlaybackAnchor>
      <footer className="editorial-card__mobile-footer relative z-[1] flex min-h-14 items-center px-1 pb-1 pt-3 text-[var(--foreground)] md:hidden">
        <div className="min-w-0">
          <Heading className="line-clamp-2 text-lg font-semibold leading-[1.05] tracking-[-.025em]">
            {title}
          </Heading>
        </div>
      </footer>
      <Link
        href={href}
        className="editorial-video-card__mobile-link absolute inset-0 z-[2] rounded-[1.1rem] md:hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
    </article>
  );
}
