"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Play, ExternalLink } from "lucide-react";

export interface Sync {
  slug: string;
  title: string;
  subtitle?: string;
  cover: string;
  youtubeUrl?: string | null;
}

interface SyncCardProps {
  sync: Sync;
  priority?: boolean;
}

export function SyncCard({ sync, priority = false }: SyncCardProps) {
  const handleClick = () => {
    if (sync.youtubeUrl) {
      window.open(sync.youtubeUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <motion.div
      className="group/card bg-[var(--color-white)] border-2 border-[var(--color-black)] rounded-[var(--radius-md)] shadow-[5px_5px_0px_var(--color-black)] overflow-hidden transition-all duration-200 hover:shadow-[8px_8px_0px_var(--color-black)] hover:translate-x-[-3px] hover:translate-y-[-3px] cursor-pointer"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
    >
      {/* Cover Image */}
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={sync.cover}
          alt={sync.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover/card:scale-105"
          priority={priority}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Play button on hover */}
        {sync.youtubeUrl && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity">
            <div className="w-14 h-14 bg-[var(--color-primary)] rounded-full border-2 border-[var(--color-black)] shadow-[4px_4px_0px_var(--color-black)] flex items-center justify-center">
              <Play size={24} className="text-white fill-white ml-1" />
            </div>
          </div>
        )}

        {/* External link indicator */}
        {sync.youtubeUrl && (
          <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity">
            <ExternalLink size={18} className="text-white drop-shadow-lg" />
          </div>
        )}

        {/* Title overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-bold text-white text-lg truncate drop-shadow-lg">
            {sync.title}
          </h3>
          {sync.subtitle && (
            <p className="text-sm text-white/80 truncate drop-shadow-md">
              {sync.subtitle}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
