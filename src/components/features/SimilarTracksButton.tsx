"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSimilarityCapabilities } from "@/hooks/use-api";

export function SimilarTracksButton({
  trackId,
  trackTitle,
  mobileAction = false,
  onNavigate,
}: {
  trackId: string;
  trackTitle: string;
  mobileAction?: boolean;
  onNavigate?: () => void;
}) {
  const { locale, localizedPath } = useI18n();
  const capabilities = useSimilarityCapabilities();
  if (!capabilities.data?.track.enabled) return null;
  const label = locale === "fr" ? "Trouver des pistes similaires" : "Find similar tracks";
  const href = `${localizedPath("/search")}?mode=ai&source=track&seed=${encodeURIComponent(trackId)}`;
  const link = <Link href={href} onClick={onNavigate} className={mobileAction ? "flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-soft)] text-[var(--ai-search)]" : "flex h-10 w-10 items-center justify-center transition hover:bg-[var(--surface-soft)] hover:text-[var(--ai-search)]"} aria-label={`${label} : ${trackTitle}`}><Sparkles size={17} /></Link>;
  if (mobileAction) {
    return <div className="track-mobile-action flex min-h-11 items-center justify-between gap-2 border border-[var(--line)] bg-[var(--background)] px-2.5 py-1.5"><span className="text-[.7rem] font-semibold leading-4">{locale === "fr" ? "Pistes similaires" : "Similar tracks"}</span><div className="track-mobile-action__control shrink-0">{link}</div></div>;
  }
  return <Tooltip label={label}>{link}</Tooltip>;
}
