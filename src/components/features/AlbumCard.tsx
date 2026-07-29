"use client";

import Image from "next/image";
import Link from "next/link";
import type { Album } from "@/types";
import { Tag } from "@/components/ui/Tag";
import { FavoriteButton } from "./FavoriteButton";
import { useI18n } from "@/components/providers/I18nProvider";
import { localizeCatalogTerm } from "@/i18n/catalog-terms";
import { resizeArtworkSource } from "@/lib/image-loader";
import { useFavoritesStore } from "@/stores/favorites-store";

interface AlbumCardProps {
  album: Album;
  priority?: boolean;
  headingLevel?: 2 | 3 | 4;
}

export function AlbumCard({ album, priority = false, headingLevel = 3 }: AlbumCardProps) {
  const { locale, t, localizedPath } = useI18n();
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  const albumCover = resizeArtworkSource(album.cover, 384);
  const isFavorite = useFavoritesStore((state) => state.albumIds.has(album.id));
  return (
    <article data-album-card={album.id} data-favorite={isFavorite ? "true" : "false"} className="album-card parigo-frame group/card relative border border-[var(--line)] bg-[var(--surface)] transition-transform duration-300 hover:-translate-y-1 active:scale-[.98]">
        <Link href={localizedPath(`/albums/${album.id}`)} prefetch={false} className="block focus-visible:outline-none">
          <div className="media-frame relative aspect-square overflow-hidden border-0 border-b border-[var(--line)] bg-[var(--surface-soft)]">
            <Image
              src={albumCover}
              alt={album.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition duration-[900ms] ease-out group-hover/card:scale-[1.035]"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
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
              {album.genres.length > 0 && (
                <Tag variant="genre" size="sm" className={isFavorite ? "mr-8 max-w-[52px] truncate sm:mr-9 sm:max-w-[80px]" : "max-w-[100px] truncate"}>
                  {localizeCatalogTerm(album.genres[0], locale)}
                </Tag>
              )}
            </div>
          </div>
        </Link>

        {!isFavorite && (
          <div className="album-card__favorite-overlay pointer-events-none absolute inset-x-0 top-0 flex aspect-square items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover/card:bg-black/48 group-hover/card:opacity-100 group-focus-within/card:bg-black/48 group-focus-within/card:opacity-100">
            <div className="pointer-events-auto">
              <FavoriteButton type="album" itemId={album.id} size="lg" className="album-card__favorite-button !h-12 !w-12 shadow-[0_9px_30px_rgba(0,0,0,.24)] focus-visible:!outline-none focus-visible:!ring-4 focus-visible:!ring-red-400/25" />
            </div>
          </div>
        )}

        {isFavorite && (
          <div className="album-card__favorite-saved absolute bottom-2.5 right-3 z-[4]">
            <FavoriteButton type="album" itemId={album.id} size="sm" className="!border-red-300 !bg-red-50 !text-red-500 shadow-[0_4px_14px_rgba(186,44,59,.16)] hover:!border-red-500 hover:!bg-red-100 focus-visible:!border-red-500 focus-visible:!outline-none focus-visible:!ring-3 focus-visible:!ring-red-400/25" />
          </div>
        )}
    </article>
  );
}
