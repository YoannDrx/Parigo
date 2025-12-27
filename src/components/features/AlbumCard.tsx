"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Heart } from "lucide-react";
import { motion } from "framer-motion";
import type { Album } from "@/types";
import { Tag } from "@/components/ui";

interface AlbumCardProps {
  album: Album;
  priority?: boolean;
}

export function AlbumCard({ album, priority = false }: AlbumCardProps) {
  return (
    <Link href={`/albums/${album.id}`}>
      <motion.div
        className="group bg-[var(--color-white)] border-2 border-[var(--color-black)] rounded-[var(--radius-md)] shadow-[5px_5px_0px_var(--color-black)] overflow-hidden transition-all duration-200 hover:shadow-[8px_8px_0px_var(--color-black)] hover:translate-x-[-3px] hover:translate-y-[-3px]"
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
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={priority}
          />

          {/* Overlay with actions */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
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
            <button
              className="w-10 h-10 bg-white rounded-full border-2 border-[var(--color-black)] shadow-[2px_2px_0px_var(--color-black)] flex items-center justify-center hover:shadow-[4px_4px_0px_var(--color-black)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-[1px_1px_0px_var(--color-black)] active:translate-x-[1px] active:translate-y-[1px] transition-all"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // TODO: Add to favorites
              }}
            >
              <Heart size={16} className="text-[var(--color-black)]" />
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-[var(--color-black)] truncate mb-1">
            {album.title}
          </h3>
          <p className="text-sm text-[var(--color-gray-600)] truncate mb-2">
            {album.label}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-gray-400)]">
              {album.trackCount} pistes
            </span>
            <div className="flex gap-1">
              {album.genres.slice(0, 1).map((genre) => (
                <Tag key={genre} variant="genre" size="sm">
                  {genre}
                </Tag>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
