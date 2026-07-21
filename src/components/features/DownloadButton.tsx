"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/components/providers/I18nProvider";
import { cn } from "@/lib/utils";

interface DownloadButtonProps {
  trackId: string;
  trackTitle: string;
  className?: string;
}

export function DownloadButton({ trackId, trackTitle, className }: DownloadButtonProps) {
  const { data: session } = useSession();
  const { locale } = useI18n();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!session?.user) return null;

  const startDownload = async () => {
    setLoading(true);
    setMessage("");
    try {
      const formatsResponse = await fetch("/api/download-formats");
      const formatsPayload = await formatsResponse.json();
      const formats = Array.isArray(formatsPayload.data?.formats) ? formatsPayload.data.formats : [];
      const format = formats.find((item: { extension?: string; bitRate?: number }) =>
        item.extension === "MP3" && item.bitRate === 320,
      ) || formats.find((item: { isDefault?: boolean }) => item.isDefault) || formats[0];
      if (!format?.id) throw new Error("No download format is available");

      const requestResponse = await fetch("/api/user/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId, formatId: format.id }),
      });
      const requestPayload = await requestResponse.json();
      if (!requestResponse.ok) throw new Error(requestPayload.error?.message || "Download rejected");
      if (requestPayload.data?.blockedContentIds?.includes(trackId)) throw new Error("This track is blocked for download");
      const token = requestPayload.data?.tokens?.[0];
      if (!token) throw new Error("Parigo did not return a download token");

      for (let attempt = 0; attempt < 8; attempt += 1) {
        if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** attempt, 8000)));
        const infoResponse = await fetch(`/api/user/downloads/${encodeURIComponent(token)}`, { cache: "no-store" });
        const info = await infoResponse.json();
        if (!infoResponse.ok) throw new Error(info.error?.message || "Download status unavailable");
        const ready = info.data?.files?.find((file: { url?: string }) => file.url);
        if (ready?.url) {
          window.location.assign(ready.url);
          return;
        }
      }
      throw new Error("The download is still being prepared. Try again shortly.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (locale === "fr" ? "Téléchargement indisponible" : "Download unavailable"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void startDownload()}
        disabled={loading}
        className={cn("flex h-10 w-10 items-center justify-center transition-colors hover:bg-[var(--surface-soft)] disabled:opacity-50", className)}
        aria-label={`${locale === "fr" ? "Télécharger" : "Download"} : ${trackTitle}`}
        title={message || (locale === "fr" ? "Télécharger" : "Download")}
      >
        {loading ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} className="text-[var(--color-gray-500)]" />}
      </button>
      {message && <span role="alert" className="sr-only">{message}</span>}
    </div>
  );
}
