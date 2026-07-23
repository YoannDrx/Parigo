"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Loader2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useAuthModalStore } from "@/stores/auth-modal-store";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";

interface FavoriteButtonProps {
  type: "track" | "album";
  itemId: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showTooltip?: boolean;
}

export function FavoriteButton({
  type,
  itemId,
  size = "md",
  className,
  showTooltip = true,
}: FavoriteButtonProps) {
  const { locale } = useI18n();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const openLogin = useAuthModalStore((state) => state.openLogin);
  const {
    isLoading,
    isLoaded,
    loadFavorites,
    toggleFavoriteTrack,
    toggleFavoriteAlbum,
    isTrackFavorite,
    isAlbumFavorite,
  } = useFavoritesStore();

  // Load favorites when user is logged in
  useEffect(() => {
    if (userId && !isLoaded && !isLoading) {
      loadFavorites();
    }
  }, [userId, isLoaded, isLoading, loadFavorites]);

  const isFavorite = type === "track" ? isTrackFavorite(itemId) : isAlbumFavorite(itemId);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user) {
      openLogin();
      return;
    }

    if (type === "track") {
      await toggleFavoriteTrack(itemId);
    } else {
      await toggleFavoriteAlbum(itemId);
    }
  };

  const sizeClasses = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22,
  };

  const tooltipLabel = !session?.user
    ? (locale === "fr" ? "Se connecter pour ajouter aux favoris" : "Sign in to add to favourites")
    : isFavorite
      ? (locale === "fr" ? "Retirer des favoris" : "Remove from favourites")
      : (locale === "fr" ? "Ajouter aux favoris" : "Add to favourites");
  const control = (
      <motion.button
        onClick={handleToggle}
        disabled={isLoading}
        className={cn(
          "rounded-full flex items-center justify-center transition-all",
          "border-2 border-transparent",
          "hover:border-[var(--color-black)] hover:shadow-[2px_2px_0px_var(--color-black)]",
          "active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
          isFavorite
            ? "bg-red-100 text-red-500 hover:bg-red-200"
            : "bg-[var(--color-gray-100)] text-[var(--color-gray-400)] hover:text-red-500 hover:bg-red-50",
          sizeClasses[size],
          className
        )}
        whileTap={{ scale: 0.9 }}
        aria-label={tooltipLabel}
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Loader2 size={iconSizes[size]} className="animate-spin" />
            </motion.div>
          ) : (
            <motion.div
              key={isFavorite ? "filled" : "empty"}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <Heart
                size={iconSizes[size]}
                className={isFavorite ? "fill-current" : ""}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
  );
  return showTooltip ? <Tooltip label={tooltipLabel}>{control}</Tooltip> : control;
}
