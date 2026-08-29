"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { useMemo } from "react";
import { ClipPlaybackAnchor } from "@/components/media/ClipPlaybackAnchor";
import { useClipPlayback } from "@/components/providers/ClipPlaybackProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { cn } from "@/lib/utils";

interface SynchronisationCardProps {
  slug: string;
  youtubeId: string;
  href: string;
  image: string;
  title: string;
  client: string;
  className?: string;
  sizes?: string;
  headingLevel?: "h2" | "h3";
}

export function SynchronisationCard({
  slug,
  youtubeId,
  href,
  image,
  title,
  client,
  className,
  sizes = "(max-width: 768px) 86vw, 55vw",
  headingLevel = "h2",
}: SynchronisationCardProps) {
  const { locale } = useI18n();
  const { activeClip, status, toggleClip } = useClipPlayback();
  const Heading = headingLevel;
  const clip = useMemo(() => ({
    slug: `synchronisation-${slug}`,
    youtubeId,
    title: { fr: title, en: title },
    cover: image,
    href,
  }), [href, image, slug, title, youtubeId]);
  const active = activeClip?.slug === clip.slug;
  const playing = active && (status === "playing" || status === "loading");
  const detailLabel = locale === "fr" ? `Voir le détail de ${title}` : `View ${title} details`;
  return (
    <article className={cn("home-sync-card editorial-video-card group block min-w-0 max-md:before:!hidden max-md:after:!hidden", className)}>
      <ClipPlaybackAnchor clip={clip} className="home-sync-card__frame relative aspect-video min-w-0 overflow-hidden bg-[#0b0e0b] max-md:!rounded-[.8rem] max-md:after:!hidden">
        <Image
          src={image}
          alt={`${title} — ${client}`}
          fill
          sizes={sizes}
          className="home-sync-card__image object-contain transition duration-700"
        />
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] -translate-x-[140%] bg-[linear-gradient(115deg,transparent_34%,rgba(255,255,255,.34)_48%,transparent_62%)] transition-transform duration-700 group-hover:translate-x-[140%] md:hidden" />
        <div className="home-sync-card__veil absolute inset-0 hidden transition duration-500 md:block" />
        <div className="absolute left-3 top-3 z-[4] flex gap-2 sm:left-5 sm:top-5">
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
          <Link
            href={href}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-black/20 !text-white shadow-[inset_0_1px_0_rgba(255,255,255,.2),0_8px_24px_rgba(0,0,0,.18)] backdrop-blur-[7px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:border-white/45 md:bg-black/55 md:shadow-xl md:backdrop-blur-md md:hover:scale-105 md:hover:bg-white md:hover:!text-[#151815]"
            aria-label={detailLabel}
          >
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="home-sync-card__caption absolute inset-x-0 bottom-0 hidden min-w-0 p-5 text-white transition duration-500 md:block md:p-8">
          <p className="truncate font-mono text-[.6rem] uppercase tracking-[.13em] opacity-70">{client}</p>
          <Heading className="mt-2 line-clamp-2 text-2xl font-semibold md:text-4xl">
            <Link href={href} className="relative z-[3] outline-none after:absolute after:-inset-x-1 after:-inset-y-0.5 focus-visible:after:ring-2 focus-visible:after:ring-white">
              {title}
            </Link>
          </Heading>
        </div>
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
