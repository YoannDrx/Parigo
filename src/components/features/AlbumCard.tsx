"use client";

import Image from "next/image";
import Link from "next/link";
import type { Album } from "@/types";
import { useI18n } from "@/components/providers/I18nProvider";
import { resizeArtworkSource } from "@/lib/image-loader";

interface AlbumCardProps {
  album: Album;
  priority?: boolean;
  headingLevel?: 2 | 3 | 4;
}

export function AlbumCard({ album, priority = false, headingLevel = 3 }: AlbumCardProps) {
  const { locale, t, localizedPath } = useI18n();
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  const albumCover = resizeArtworkSource(album.cover, priority ? 320 : 384);
  return (
    <article data-album-card={album.id} data-release-date={album.releaseDate || album.year || undefined} className="album-card parigo-frame group/card relative min-w-0 border border-[var(--line)] bg-[var(--surface)] transition-transform duration-300 hover:-translate-y-1 active:scale-[.98]">
        <Link href={localizedPath(`/albums/${album.id}`)} prefetch={false} className="block min-w-0 focus-visible:outline-none">
          <div className="media-frame relative aspect-square overflow-hidden border-0 border-b border-[var(--line)] bg-[var(--surface-soft)]">
            <Image
              src={albumCover}
              alt={album.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={priority
                ? "object-cover"
                : "object-cover transition duration-[900ms] ease-out group-hover/card:scale-[1.035]"}
              preload={priority}
              fetchPriority={priority ? "high" : undefined}
              decoding={priority ? "sync" : "async"}
            />
          </div>

          <div className="flex min-w-0 flex-col p-4">
            <Heading className="truncate text-lg font-semibold leading-tight tracking-[-.035em] md:text-xl">
              {album.title}
            </Heading>
            <p className="mb-3 mt-1 truncate text-xs text-[var(--text-muted)]">
              {album.label}
            </p>
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="flex-shrink-0 text-xs text-[var(--text-muted)]">
                {album.trackCount} {album.trackCount === 1 ? t("catalog.track") : t("catalog.tracks")}
              </span>
              {album.code && <span className="album-reference-tag min-w-0">{locale === "fr" ? "Réf." : "Ref."} {album.code}</span>}
            </div>
          </div>
        </Link>
    </article>
  );
}
