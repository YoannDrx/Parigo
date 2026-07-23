"use client";

import Image from "next/image";
import Link from "next/link";
import type { Album } from "@/types";
import { Tag } from "@/components/ui/Tag";
import { FavoriteButton } from "./FavoriteButton";
import { useI18n } from "@/components/providers/I18nProvider";
import { localizeCatalogTerm } from "@/i18n/catalog-terms";

interface AlbumCardProps {
  album: Album;
  priority?: boolean;
  headingLevel?: 2 | 3 | 4;
}

export function AlbumCard({ album, priority = false, headingLevel = 3 }: AlbumCardProps) {
  const { locale, t, localizedPath } = useI18n();
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  return (
    <Link href={localizedPath(`/albums/${album.id}`)}>
      <div className="parigo-frame group/card border border-[var(--line)] bg-[var(--surface)] transition-transform duration-300 hover:-translate-y-1 active:scale-[.98]">
        {/* Cover Image */}
        <div className="media-frame relative aspect-square overflow-hidden border-0 border-b border-[var(--line)] bg-[var(--surface-soft)]">
          <Image
            src={album.cover}
            alt={album.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition duration-[900ms] ease-out group-hover/card:scale-[1.035]"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
          />

          {/* Overlay with actions */}
          <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/0 opacity-0 transition-all duration-300 group-hover/card:bg-black/45 group-hover/card:opacity-100 group-focus-within/card:opacity-100">
            <FavoriteButton type="album" itemId={album.id} size="md" />
          </div>
        </div>

        {/* Info - fixed height to ensure uniform card sizes */}
        <div className="flex min-w-0 flex-col p-4">
          <Heading className="truncate text-lg font-semibold leading-tight tracking-[-.035em] md:text-xl">
            {album.title}
          </Heading>
          <p className="mb-3 mt-1 truncate text-xs text-[var(--text-muted)]">
            {album.label}
          </p>
          <div className="flex items-center justify-between mt-auto gap-2 min-w-0">
            <span className="flex-shrink-0 text-xs text-[var(--text-muted)]">
              {album.trackCount} {album.trackCount === 1 ? t("catalog.track") : t("catalog.tracks")}
            </span>
            {album.genres.length > 0 && (
              <Tag variant="genre" size="sm" className="truncate max-w-[100px]">
                {localizeCatalogTerm(album.genres[0], locale)}
              </Tag>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
