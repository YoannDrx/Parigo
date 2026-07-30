"use client";

import Image from "next/image";
import { ExternalLink, Pause, Play } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useClipPlayback } from "@/components/providers/ClipPlaybackProvider";
import { ClipPlaybackAnchor } from "./ClipPlaybackAnchor";
import type { ClipPlaybackDescriptor } from "@/lib/editorial/video-types";
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

type ConsentAwareYouTubeEmbedProps =
  | { clip: ClipPlaybackDescriptor }
  | { title: string; cover: string; youtubeId?: string };

export function ConsentAwareYouTubeEmbed(props: ConsentAwareYouTubeEmbedProps) {
  const { locale } = useI18n();
  const { activeClip, status, toggleClip } = useClipPlayback();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => CONSENT_UNSET);
  const persistent = "clip" in props;
  const clip = persistent ? props.clip : null;
  const title = persistent ? props.clip.title[locale] : props.title;
  const cover = persistent ? props.clip.cover : props.cover;
  const youtubeId = persistent ? props.clip.youtubeId : props.youtubeId;
  const youtubeUrl = youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : undefined;
  const active = Boolean(clip && activeClip?.slug === clip.slug);
  const playing = active && (status === "playing" || status === "loading");

  if (!clip) {
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

  if (!youtubeId) {
    return (
      <ClipPlaybackAnchor clip={clip} className="aspect-video overflow-hidden bg-black" testId="clip-detail-player-anchor">
        <Image src={cover} alt={title} fill sizes="(max-width: 1024px) 100vw, 66vw" className="object-cover opacity-75" />
        <div className="absolute inset-0 grid place-items-center bg-black/35 p-6 text-center text-white">
          <p className="max-w-md text-lg font-semibold">
            {locale === "fr" ? "Vidéo prochainement disponible" : "Video coming soon"}
          </p>
        </div>
      </ClipPlaybackAnchor>
    );
  }

  if (marketingAllowed(snapshot)) {
    return (
      <ClipPlaybackAnchor clip={clip} className="aspect-video overflow-hidden bg-black" testId="clip-detail-player-anchor">
        <Image src={cover} alt={title} fill sizes="(max-width: 1024px) 100vw, 66vw" className="object-cover opacity-75" />
        <div className="absolute inset-0 grid place-items-center bg-black/28 p-6 text-center text-white">
          <button
            type="button"
            onClick={() => toggleClip(clip)}
            className="grid h-16 w-16 place-items-center rounded-full border border-white/55 bg-black/62 shadow-[0_18px_55px_rgba(0,0,0,.4)] backdrop-blur-md transition hover:scale-105 hover:bg-[var(--signal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={playing
              ? (locale === "fr" ? `Mettre en pause ${title}` : `Pause ${title}`)
              : (locale === "fr" ? `Lire ${title}` : `Play ${title}`)}
          >
            {playing ? <Pause size={23} fill="currentColor" /> : <Play size={23} className="ml-1" fill="currentColor" />}
          </button>
        </div>
      </ClipPlaybackAnchor>
    );
  }

  return (
    <ClipPlaybackAnchor clip={clip} className="aspect-video overflow-hidden bg-black" testId="clip-detail-player-anchor">
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
    </ClipPlaybackAnchor>
  );
}
