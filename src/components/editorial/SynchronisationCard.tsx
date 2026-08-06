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
        <div className="home-sync-card__veil absolute inset-0 transition duration-500" />
        <div className="absolute left-3 top-3 z-[4] flex gap-2 sm:left-5 sm:top-5">
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
        <div className="home-sync-card__caption absolute inset-x-0 bottom-0 min-w-0 p-5 text-white transition duration-500 md:p-8">
          <p className="truncate font-mono text-[.6rem] uppercase tracking-[.13em] opacity-70">{client}</p>
          <Heading className="mt-2 line-clamp-2 text-2xl font-semibold md:text-4xl">
            <Link href={href} className="relative z-[3] outline-none after:absolute after:-inset-x-1 after:-inset-y-0.5 focus-visible:after:ring-2 focus-visible:after:ring-white">
              {title}
            </Link>
          </Heading>
          {detail && <p className="mt-2 truncate text-sm text-white/72">{detail}</p>}
        </div>
      </ClipPlaybackAnchor>
    </article>
  );
}
