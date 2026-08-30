"use client";

import { useEffect } from "react";
import { Heart } from "lucide-react";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { useSession } from "@/lib/auth-client";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useAuthModalStore } from "@/stores/auth-modal-store";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";
import { useI18n } from "@/components/providers/I18nProvider";

interface FavoriteButtonProps {
  type: "track";
  itemId: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showTooltip?: boolean;
  appearance?: "default" | "editorial";
  onAction?: () => void;
}

export function FavoriteButton({
  itemId,
  size = "md",
  className,
  showTooltip = true,
  appearance = "default",
  onAction,
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
    isTrackFavorite,
  } = useFavoritesStore();

  // Load favorites when user is logged in
  useEffect(() => {
    if (userId && !isLoaded && !isLoading) {
      loadFavorites();
    }
  }, [userId, isLoaded, isLoading, loadFavorites]);

  const isFavorite = isTrackFavorite(itemId);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user) {
      onAction?.();
      openLogin();
      return;
    }

    onAction?.();
    await toggleFavoriteTrack(itemId);
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
          "flex items-center justify-center transition",
          appearance === "editorial"
            ? "border border-[var(--line)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--signal-strong)] hover:bg-[var(--surface-soft)] hover:text-[var(--signal-strong)]"
            : "rounded-full border-2 border-transparent hover:border-[var(--color-black)] hover:shadow-[2px_2px_0px_var(--color-black)] focus-visible:border-red-400 focus-visible:text-red-500 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-red-400/25 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
          isFavorite
            ? appearance === "editorial" ? "border-[var(--signal-strong)] text-[var(--signal-strong)]" : "bg-red-100 text-red-500 hover:bg-red-200"
            : appearance === "editorial" ? "" : "bg-[var(--color-gray-100)] text-[var(--color-gray-400)] hover:bg-red-50 hover:text-red-500",
          sizeClasses[size],
          className
        )}
        aria-label={tooltipLabel}
        aria-pressed={isFavorite}
      >
          {isLoading ? (
            <span className="animate-[fade-in_.18s_ease-out_both]">
              <ParigoLoader size="icon" label={locale === "fr" ? "Mise à jour du favori" : "Updating favourite"} />
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
