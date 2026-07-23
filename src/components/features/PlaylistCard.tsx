"use client";

import Image from "next/image";
import Link from "next/link";
import type { Playlist } from "@/types";
import { useI18n } from "@/components/providers/I18nProvider";

interface PlaylistCardProps {
  playlist: Playlist;
}

export function PlaylistCard({ playlist }: PlaylistCardProps) {
  const { t, localizedPath } = useI18n();
  return (
    <Link href={localizedPath(`/playlists/${playlist.id}`)}>
      <div className="parigo-frame group/card border border-[var(--line)] bg-[var(--surface)] transition-transform duration-300 hover:-translate-y-1 active:scale-[.98]">
        {/* Cover Image */}
        <div className="media-frame relative aspect-square overflow-hidden border-0 border-b border-[var(--line)] bg-[var(--surface-soft)]">
          <Image
            src={playlist.cover}
            alt={playlist.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-[900ms] ease-out group-hover/card:scale-[1.035]"
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Category badge */}
          {playlist.category && (
            <div className="absolute top-3 left-3">
              <span className="px-2 py-1 bg-[var(--color-black)] text-white text-xs font-medium rounded-full">
                {playlist.category}
              </span>
            </div>
          )}
        </div>

        {/* Info - fixed height for uniform cards */}
        <div className="flex min-w-0 flex-col p-4">
          <h3 className="mb-1 truncate text-lg font-semibold tracking-[-.035em] md:text-xl">
            {playlist.title}
          </h3>
          <p className="line-clamp-2 flex-1 text-xs text-[var(--text-muted)]">
            {playlist.description}
          </p>
          <p className="text-xs text-[var(--color-gray-400)] mt-auto">
            {playlist.trackCount ?? playlist.trackIds?.length ?? 0} {t("catalog.tracks")}
          </p>
        </div>
      </div>
    </Link>
  );
}
