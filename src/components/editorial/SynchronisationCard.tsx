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
  detail?: string;
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
  detail,
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
  const mobilePlayLabel = playing ? "Pause" : (locale === "fr" ? "Lire" : "Play");

  return (
    <article className={cn("home-sync-card group block min-w-0", className)}>
      <ClipPlaybackAnchor clip={clip} className="home-sync-card__frame relative aspect-video min-w-0 overflow-hidden bg-[#0b0e0b]">
        <Image
          src={image}
          alt={`${title} — ${client}`}
          fill
          sizes={sizes}
          className="home-sync-card__image object-contain transition duration-700"
        />
        <div className="home-sync-card__veil absolute inset-0 hidden transition duration-500 md:block" />
        <div className="absolute left-3 top-3 z-[4] hidden gap-2 sm:left-5 sm:top-5 md:flex">
          <button
            type="button"
            onClick={() => toggleClip(clip)}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/45 bg-black/55 text-white shadow-xl backdrop-blur-md transition hover:scale-105 hover:bg-[var(--signal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={playing
              ? (locale === "fr" ? `Mettre en pause ${title}` : `Pause ${title}`)
              : (locale === "fr" ? `Lire ${title}` : `Play ${title}`)}
          >
            {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} className="ml-0.5" fill="currentColor" />}
          </button>
          <Link
            href={href}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/45 bg-black/55 !text-white shadow-xl backdrop-blur-md transition hover:scale-105 hover:bg-white hover:!text-[#151815] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={locale === "fr" ? `Voir le détail de ${title}` : `View ${title} details`}
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
          {detail && <p className="mt-2 truncate text-sm text-white/72">{detail}</p>}
        </div>
      </ClipPlaybackAnchor>
      <footer className="editorial-card__mobile-footer relative z-[1] border-t border-white/15 bg-[#0b0e0b] p-3.5 text-white md:hidden">
        {detail ? <p className="font-mono text-[.54rem] uppercase tracking-[.13em] text-white/62">{detail}</p> : null}
        <Heading className={cn("line-clamp-2 text-lg font-semibold leading-[1.08] tracking-[-.04em]", detail ? "mt-1.5" : "mt-0")}>
          <Link href={href} className="outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]">
            {title}
          </Link>
        </Heading>
        <div className="mt-3 flex items-center gap-2 border-t border-white/12 pt-2.5">
          <button
            type="button"
            onClick={() => toggleClip(clip)}
            className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-[var(--parigo-corner-md)_var(--parigo-turn-md)] border border-[var(--signal)] bg-[var(--signal-strong)] px-4 text-sm font-semibold text-[var(--signal-contrast)] transition active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0e0b]"
            aria-label={playing
              ? (locale === "fr" ? `Mettre en pause ${title}` : `Pause ${title}`)
              : (locale === "fr" ? `Lire ${title}` : `Play ${title}`)}
          >
            {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} className="ml-0.5" fill="currentColor" />}
            <span>{mobilePlayLabel}</span>
          </button>
          <Link
            href={href}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--parigo-corner-md)_var(--parigo-turn-md)] border border-white/28 bg-white/[.04] !text-white transition active:scale-[.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]"
            aria-label={locale === "fr" ? `Voir le détail de ${title}` : `View ${title} details`}
          >
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </footer>
    </article>
  );
}
