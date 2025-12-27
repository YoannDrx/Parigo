"use client";

import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { motion } from "framer-motion";
import type { Playlist } from "@/types";

interface PlaylistCardProps {
  playlist: Playlist;
}

export function PlaylistCard({ playlist }: PlaylistCardProps) {
  return (
    <Link href={`/playlists/${playlist.id}`}>
      <motion.div
        className="group bg-[var(--color-white)] border-2 border-[var(--color-black)] rounded-[var(--radius-md)] shadow-[5px_5px_0px_var(--color-black)] overflow-hidden transition-all duration-200 hover:shadow-[8px_8px_0px_var(--color-black)] hover:translate-x-[-3px] hover:translate-y-[-3px]"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Cover Image */}
        <div className="relative aspect-video overflow-hidden">
          <Image
            src={playlist.cover}
            alt={playlist.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="w-14 h-14 bg-[var(--color-primary)] rounded-full border-2 border-[var(--color-black)] shadow-[4px_4px_0px_var(--color-black)] flex items-center justify-center hover:shadow-[6px_6px_0px_var(--color-black)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // TODO: Play playlist
              }}
            >
              <Play size={24} className="text-white fill-white ml-1" />
            </button>
          </div>

          {/* Category badge */}
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 bg-[var(--color-black)] text-white text-xs font-medium rounded-full">
              {playlist.category}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-[var(--color-black)] truncate mb-1">
            {playlist.title}
          </h3>
          <p className="text-sm text-[var(--color-gray-600)] line-clamp-2">
            {playlist.description}
          </p>
          <p className="text-xs text-[var(--color-gray-400)] mt-2">
            {playlist.trackIds.length} pistes
          </p>
        </div>
      </motion.div>
    </Link>
  );
}
