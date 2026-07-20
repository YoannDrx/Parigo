"use client";

import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { motion } from "framer-motion";
import type { Album } from "@/types";
import { Tag } from "@/components/ui";
import { FavoriteButton } from "./FavoriteButton";
import { useI18n } from "@/components/providers/I18nProvider";
import { localizeCatalogTerm } from "@/i18n/catalog-terms";

interface AlbumCardProps {
  album: Album;
  priority?: boolean;
}

export function AlbumCard({ album, priority = false }: AlbumCardProps) {
  const { locale, t } = useI18n();
  return (
    <Link href={`/albums/${album.id}`}>
      <motion.div
        className="group/card"
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Cover Image */}
        <div className="relative aspect-square overflow-hidden border border-[var(--line)] bg-[var(--surface-soft)]">
          <Image
            src={album.cover}
            alt={album.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition duration-[900ms] ease-out group-hover/card:scale-[1.035]"
            priority={priority}
          />

          {/* Overlay with actions */}
          <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/0 opacity-0 transition-all duration-300 group-hover/card:bg-black/45 group-hover/card:opacity-100 group-focus-within/card:opacity-100">
            <button
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-black transition hover:scale-105"
              aria-label={`${t("common.play")} ${album.title}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // TODO: Play album
              }}
            >
              <Play size={20} className="fill-current ml-1" />
            </button>
            <FavoriteButton type="album" itemId={album.id} size="md" />
          </div>
        </div>

        {/* Info - fixed height to ensure uniform card sizes */}
        <div className="flex min-w-0 flex-col pt-4">
          <h3 className="truncate text-lg font-semibold leading-tight tracking-[-.035em] md:text-xl">
            {album.title}
          </h3>
          <p className="mb-3 mt-1 truncate text-xs text-[var(--text-muted)]">
            {album.label}
          </p>
          <div className="flex items-center justify-between mt-auto gap-2 min-w-0">
            <span className="text-xs text-[var(--color-gray-400)] flex-shrink-0">
              {album.trackCount} {album.trackCount === 1 ? t("catalog.track") : t("catalog.tracks")}
            </span>
            {album.genres.length > 0 && (
              <Tag variant="genre" size="sm" className="truncate max-w-[100px]">
                {localizeCatalogTerm(album.genres[0], locale)}
              </Tag>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
