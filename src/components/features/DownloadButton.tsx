"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/components/providers/I18nProvider";
import { useAuthModalStore } from "@/stores/auth-modal-store";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui";

interface DownloadButtonProps {
  trackId: string;
  trackTitle: string;
  className?: string;
}

export function DownloadButton({ trackId, trackTitle, className }: DownloadButtonProps) {
  const { data: session } = useSession();
  const openLogin = useAuthModalStore((state) => state.openLogin);
  const { locale } = useI18n();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const startDownload = async () => {
    if (!session?.user) {
      openLogin();
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const formatsResponse = await fetch("/api/download-formats");
      const formatsPayload = await formatsResponse.json();
      const formats = Array.isArray(formatsPayload.data?.formats) ? formatsPayload.data.formats : [];
      const format = formats.find((item: { extension?: string; bitRate?: number }) =>
        item.extension === "MP3" && item.bitRate === 320,
      ) || formats.find((item: { isDefault?: boolean }) => item.isDefault) || formats[0];
      if (!format?.id) throw new Error(locale === "fr" ? "Aucun format de téléchargement n’est disponible." : "No download format is available.");

      const requestResponse = await fetch("/api/user/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId, formatId: format.id }),
      });
      const requestPayload = await requestResponse.json();
      if (!requestResponse.ok) throw new Error(requestPayload.error?.message || (locale === "fr" ? "Le téléchargement a été refusé." : "Download rejected."));
      if (requestPayload.data?.blockedContentIds?.includes(trackId)) throw new Error(locale === "fr" ? "Cette piste n’est pas disponible au téléchargement." : "This track is blocked for download.");
      const token = requestPayload.data?.tokens?.[0];
      if (!token) throw new Error(locale === "fr" ? "Parigo n’a pas fourni de lien de téléchargement." : "Parigo did not return a download token.");

      for (let attempt = 0; attempt < 8; attempt += 1) {
        if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** attempt, 8000)));
        const infoResponse = await fetch(`/api/user/downloads/${encodeURIComponent(token)}`, { cache: "no-store" });
        const info = await infoResponse.json();
        if (!infoResponse.ok) throw new Error(info.error?.message || (locale === "fr" ? "Le statut du téléchargement est indisponible." : "Download status unavailable."));
        const ready = info.data?.files?.find((file: { url?: string }) => file.url);
        if (ready?.url) {
          window.location.assign(ready.url);
          return;
        }
      }
      throw new Error(locale === "fr" ? "Le téléchargement est encore en préparation. Réessayez dans un instant." : "The download is still being prepared. Try again shortly.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (locale === "fr" ? "Téléchargement indisponible" : "Download unavailable"));
    } finally {
      setLoading(false);
    }
  };

  const tooltipLabel = message || (!session?.user ? (locale === "fr" ? "Se connecter pour télécharger" : "Sign in to download") : (locale === "fr" ? "Télécharger" : "Download"));
  return (
    <div className="relative inline-flex">
      <Tooltip label={tooltipLabel}>
      <button
        type="button"
        onClick={() => void startDownload()}
        disabled={loading}
        className={cn("flex h-10 w-10 items-center justify-center transition-colors hover:bg-[var(--surface-soft)] disabled:opacity-50", className)}
        aria-label={`${locale === "fr" ? "Télécharger" : "Download"} : ${trackTitle}`}
      >
        {loading ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} className="text-[var(--color-gray-500)]" />}
      </button>
      </Tooltip>
      {message && <span role="alert" className="sr-only">{message}</span>}
    </div>
  );
}
