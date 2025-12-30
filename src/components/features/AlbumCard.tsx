"use client";

import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { motion } from "framer-motion";
import type { Album } from "@/types";
import { Tag } from "@/components/ui";
import { FavoriteButton } from "./FavoriteButton";

interface AlbumCardProps {
  album: Album;
  priority?: boolean;
}

export function AlbumCard({ album, priority = false }: AlbumCardProps) {
  return (
    <Link href={`/albums/${album.id}`}>
      <motion.div
        className="group/card bg-[var(--color-white)] border-2 border-[var(--color-black)] rounded-[var(--radius-md)] shadow-[5px_5px_0px_var(--color-black)] overflow-hidden transition-all duration-200 hover:shadow-[8px_8px_0px_var(--color-black)] hover:translate-x-[-3px] hover:translate-y-[-3px]"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Cover Image */}
        <div className="relative aspect-square overflow-hidden">
          <Image
            src={album.cover}
            alt={album.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover/card:scale-105"
            priority={priority}
          />

          {/* Overlay with actions */}
          <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/40 transition-all duration-200 flex items-center justify-center gap-3 opacity-0 group-hover/card:opacity-100">
            <button
              className="w-12 h-12 bg-[var(--color-primary)] rounded-full border-2 border-[var(--color-black)] shadow-[3px_3px_0px_var(--color-black)] flex items-center justify-center hover:shadow-[5px_5px_0px_var(--color-black)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-[1px_1px_0px_var(--color-black)] active:translate-x-[1px] active:translate-y-[1px] transition-all"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // TODO: Play album
              }}
            >
              <Play size={20} className="text-white fill-white ml-1" />
            </button>
            <FavoriteButton type="album" itemId={album.id} size="md" />
          </div>
        </div>

        {/* Info - fixed height to ensure uniform card sizes */}
        <div className="p-3 h-[100px] flex flex-col min-w-0">
          <h3 className="font-semibold text-[var(--color-black)] truncate mb-0.5 text-sm leading-tight">
            {album.title}
          </h3>
          <p className="text-xs text-[var(--color-gray-600)] truncate mb-2">
            {album.label}
          </p>
          <div className="flex items-center justify-between mt-auto gap-2 min-w-0">
            <span className="text-xs text-[var(--color-gray-400)] flex-shrink-0">
              {album.trackCount} pistes
            </span>
            {album.genres.length > 0 && (
              <Tag variant="genre" size="sm" className="truncate max-w-[100px]">
                {album.genres[0]}
              </Tag>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
