import type { Locale } from "@/i18n/messages";

function illustration(filename: string, src: string, imageClassName: string, altFr: string, altEn: string) {
  return {
    filename,
    src,
    imageClassName,
    alt: (locale: Locale) => locale === "fr" ? altFr : altEn,
  };
}

export const emptyStateIllustrations = {
  shortlist: illustration(
    "r22-shortlist-vide-1600x1200.avif",
    "/images/editorial/parigo-real/r22-shortlist-vide-1600x1200.avif",
    "origin-[50%_56%] scale-[1.26]",
    "Casque, ordinateurs et carnets disposés autour d’une table de sélection.",
    "Headphones, laptops and notebooks arranged around a selection table.",
  ),
} as const;
