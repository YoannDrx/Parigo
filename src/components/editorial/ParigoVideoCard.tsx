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

  return (
    <article className={cn("home-sync-card parigo-video-card editorial-media-card group relative block min-w-0", className)}>
      <ClipPlaybackAnchor
        clip={clip}
        className="home-sync-card__frame parigo-video-card__frame relative aspect-video min-w-0 overflow-hidden bg-[#0b0e0b]"
      >
        <Image
          src={image}
          alt={title}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-700 group-hover:scale-[1.025] group-focus-within:scale-[1.025]"
        />
        <div className="editorial-media-card__veil absolute inset-0 bg-gradient-to-t from-black/84 via-black/8 to-black/10" />
        <div className="parigo-video-card__actions absolute left-3 top-3 z-[4] flex gap-2 sm:left-4 sm:top-4">
          {clip.youtubeId ? (
            <button
              type="button"
              onClick={() => toggleClip(clip)}
              className="media-overlay-action media-overlay-action--play grid h-11 w-11 place-items-center rounded-full border border-white/45 text-white transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label={playing
                ? (locale === "fr" ? `Mettre en pause ${title}` : `Pause ${title}`)
                : (locale === "fr" ? `Lire ${title}` : `Play ${title}`)}
            >
              {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} className="ml-0.5" fill="currentColor" />}
            </button>
          ) : null}
          <Link
            href={href}
            className="media-overlay-action media-overlay-action--detail grid h-11 w-11 place-items-center rounded-full border border-white/45 !text-white transition hover:scale-105 hover:!text-[#151815] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={locale === "fr" ? `Voir le détail de ${title}` : `View ${title} details`}
          >
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <span aria-hidden="true" className="parigo-video-card__ring" />
      </ClipPlaybackAnchor>
      <div className="editorial-media-card__caption min-w-0 p-4 sm:p-6">
        <p className="truncate font-mono text-[.54rem] uppercase tracking-[.13em] text-[var(--signal-strong)] md:text-white/68">{eyebrow}</p>
        <Heading className="type-card mt-1.5 line-clamp-2 font-semibold md:text-3xl">
          <Link href={href} className="relative z-[3] outline-none after:absolute after:-inset-x-1 after:-inset-y-0.5 focus-visible:after:ring-2 focus-visible:after:ring-[var(--signal)] md:focus-visible:after:ring-white">
            {title}
          </Link>
        </Heading>
        {detail && <p className="mt-2 line-clamp-2 text-sm text-[var(--text-muted)] md:line-clamp-1 md:text-white/72">{detail}</p>}
      </div>
    </article>
  );
}
