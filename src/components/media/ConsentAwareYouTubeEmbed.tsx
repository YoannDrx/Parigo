"use client";

import Image from "next/image";
import { ExternalLink, Play } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import {
  CONSENT_CHANGE_EVENT,
  CONSENT_OPEN_EVENT,
  CONSENT_STORAGE_KEY,
  CONSENT_UNSET,
  normalizeConsentSnapshot,
} from "@/lib/consent";

function subscribe(callback: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, callback);
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, callback);
}

function getSnapshot() {
  return normalizeConsentSnapshot(window.localStorage.getItem(CONSENT_STORAGE_KEY));
}

function marketingAllowed(snapshot: string): boolean {
  if (snapshot === CONSENT_UNSET) return false;
  try {
    return Boolean((JSON.parse(snapshot) as { marketing?: boolean }).marketing);
  } catch {
    return false;
  }
}

export function ConsentAwareYouTubeEmbed({
  title,
  cover,
  youtubeId,
}: {
  title: string;
  cover: string;
  youtubeId?: string;
}) {
  const { locale } = useI18n();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => CONSENT_UNSET);
  const youtubeUrl = youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : undefined;

  if (!youtubeId) {
    return (
      <div className="relative aspect-video overflow-hidden bg-black">
        <Image src={cover} alt={title} fill sizes="(max-width: 1024px) 100vw, 66vw" className="object-cover opacity-75" />
        <div className="absolute inset-0 grid place-items-center bg-black/35 p-6 text-center text-white">
          <p className="max-w-md text-lg font-semibold">
            {locale === "fr" ? "Vidéo prochainement disponible" : "Video coming soon"}
          </p>
        </div>
      </div>
    );
  }

  if (marketingAllowed(snapshot)) {
    return (
      <div className="relative aspect-video overflow-hidden bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    );
  }

  return (
    <div className="relative aspect-video overflow-hidden bg-black">
      <Image src={cover} alt={title} fill sizes="(max-width: 1024px) 100vw, 66vw" className="object-cover opacity-45" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/45 p-6 text-center text-white">
        <Play size={30} fill="currentColor" />
        <p className="max-w-lg text-sm leading-6 text-white/85">
          {locale === "fr"
            ? "Cette vidéo YouTube nécessite votre autorisation pour les médias et le marketing."
            : "This YouTube video requires your consent for media and marketing."}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}
            className="min-h-11 bg-white px-4 text-sm font-semibold text-black"
          >
            {locale === "fr" ? "Ouvrir les préférences" : "Open preferences"}
          </button>
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 border border-white/55 px-4 text-sm font-semibold text-white"
          >
            YouTube
            <ExternalLink size={15} />
          </a>
        </div>
      </div>
    </div>
  );
}
