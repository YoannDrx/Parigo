"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/components/providers/I18nProvider";
import { useAuthModalStore } from "@/stores/auth-modal-store";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";

interface DownloadButtonProps {
  trackId: string;
  trackTitle: string;
  className?: string;
  label?: string;
  onAction?: () => void;
}

export function DownloadButton({ trackId, trackTitle, className, label, onAction }: DownloadButtonProps) {
  const { data: session } = useSession();
  const openLogin = useAuthModalStore((state) => state.openLogin);
  const { locale } = useI18n();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const startDownload = async () => {
    onAction?.();
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
      const downloadUrl = requestPayload.data?.downloadUrls?.[0];
      if (downloadUrl) {
        window.location.assign(downloadUrl);
        return;
      }
      if (requestPayload.data?.requested) {
        setMessage(locale === "fr" ? "Le lien de téléchargement vous sera envoyé par e-mail." : "The download link will be sent by email.");
        return;
      }
      throw new Error(locale === "fr" ? "Parigo n’a pas fourni de lien de téléchargement." : "Parigo did not return a download link.");
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
        className={cn(
          "flex min-h-10 items-center justify-center transition-colors hover:bg-[var(--surface-soft)] disabled:opacity-50",
          label ? "gap-2 border border-[var(--line-strong)] px-3 text-xs font-semibold hover:border-[var(--signal-strong)] hover:text-[var(--signal-strong)]" : "h-10 w-10",
          className,
        )}
        aria-label={`${label || (locale === "fr" ? "Télécharger" : "Download")} : ${trackTitle}`}
      >
        {loading ? <ParigoLoader size="icon" label={locale === "fr" ? "Préparation du téléchargement" : "Preparing download"} /> : <Download size={17} className="text-[var(--color-gray-500)]" />}
        {label && <span>{label}</span>}
      </button>
      </Tooltip>
      {message && <span role="alert" className="sr-only">{message}</span>}
    </div>
  );
}
