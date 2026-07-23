"use client";

import { useEffect } from "react";
import { Heart, Loader2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useAuthModalStore } from "@/stores/auth-modal-store";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";
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
      <button
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
        aria-label={tooltipLabel}
      >
          {isLoading ? (
            <span className="animate-[fade-in_.18s_ease-out_both]">
              <Loader2 size={iconSizes[size]} className="animate-spin" />
            </span>
          ) : (
            <span
              key={isFavorite ? "filled" : "empty"}
              className="animate-[fade-in_.18s_ease-out_both]"
            >
              <Heart
                size={iconSizes[size]}
                className={isFavorite ? "fill-current" : ""}
              />
            </span>
          )}
      </button>
  );
  return showTooltip ? <Tooltip label={tooltipLabel}>{control}</Tooltip> : control;
}
