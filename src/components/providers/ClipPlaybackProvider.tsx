"use client";

import Link from "next/link";
import { ExternalLink, RotateCcw, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { ClipPlaybackDescriptor } from "@/lib/editorial/video-types";
import {
  CONSENT_CHANGE_EVENT,
  CONSENT_OPEN_EVENT,
  CONSENT_STORAGE_KEY,
  CONSENT_UNSET,
  normalizeConsentSnapshot,
} from "@/lib/consent";
import { useI18n } from "./I18nProvider";
import { usePlaybackCoordinator } from "./PlaybackCoordinatorProvider";

export type ClipPlaybackStatus = "idle" | "loading" | "playing" | "paused" | "ended" | "error";

interface YouTubePlayer {
  destroy: () => void;
  getPlayerState: () => number;
  loadVideoById: (videoId: string) => void;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
}

interface YouTubePlayerEvent {
  data: number;
  target: YouTubePlayer;
}

interface YouTubeNamespace {
  Player: new (
    element: HTMLIFrameElement,
    options: {
      events: {
        onReady: (event: YouTubePlayerEvent) => void;
        onStateChange: (event: YouTubePlayerEvent) => void;
        onError: () => void;
        onAutoplayBlocked: () => void;
      };
    },
  ) => YouTubePlayer;
  PlayerState: {
    BUFFERING: number;
    CUED: number;
    ENDED: number;
    PAUSED: number;
    PLAYING: number;
    UNSTARTED: number;
  };
}

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface ClipPlaybackContextValue {
  activeClip: ClipPlaybackDescriptor | null;
  status: ClipPlaybackStatus;
  closeClip: () => void;
  pauseClip: () => void;
  playClip: (clip: ClipPlaybackDescriptor) => boolean;
  registerClipAnchor: (clip: ClipPlaybackDescriptor, element: HTMLElement) => () => void;
  resumeClip: () => void;
  toggleClip: (clip: ClipPlaybackDescriptor) => void;
}

interface PlayerRect {
  height: number;
  left: number;
  top: number;
  width: number;
}

const YOUTUBE_API_SCRIPT_ID = "parigo-youtube-iframe-api";
const ATTACHMENT_RATIO = 0.6;
let youtubeApiPromise: Promise<YouTubeNamespace> | null = null;

const ClipPlaybackContext = createContext<ClipPlaybackContextValue | null>(null);

function subscribeToConsent(callback: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, callback);
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, callback);
}

function getConsentSnapshot() {
  return normalizeConsentSnapshot(window.localStorage.getItem(CONSENT_STORAGE_KEY));
}

function marketingAllowed(snapshot: string) {
  if (snapshot === CONSENT_UNSET) return false;
  try {
    return Boolean((JSON.parse(snapshot) as { marketing?: boolean }).marketing);
  } catch {
    return false;
  }
}

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise<YouTubeNamespace>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (window.YT) resolve(window.YT);
      else reject(new Error("YouTube IFrame API unavailable"));
    };

    const existing = document.getElementById(YOUTUBE_API_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("error", () => reject(new Error("YouTube IFrame API failed to load")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = YOUTUBE_API_SCRIPT_ID;
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.addEventListener("error", () => reject(new Error("YouTube IFrame API failed to load")), { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    youtubeApiPromise = null;
    throw error;
  });

  return youtubeApiPromise;
}

function unloadYouTubeApi() {
  document.getElementById(YOUTUBE_API_SCRIPT_ID)?.remove();
  youtubeApiPromise = null;
  try {
    delete window.YT;
    delete window.onYouTubeIframeAPIReady;
  } catch {
    // Some browsers expose third-party globals as non-configurable.
  }
}

function intersectionRatio(rect: DOMRect) {
  const visibleWidth = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
  const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
  const area = rect.width * rect.height;
  return area > 0 ? (visibleWidth * visibleHeight) / area : 0;
}

function equalRect(left: PlayerRect | null, right: PlayerRect) {
  return Boolean(
    left
      && Math.abs(left.left - right.left) < 0.5
      && Math.abs(left.top - right.top) < 0.5
      && Math.abs(left.width - right.width) < 0.5
      && Math.abs(left.height - right.height) < 0.5,
  );
}

function readSafeAreaBottom() {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom)";
  document.body.appendChild(probe);
  const value = Number.parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  probe.remove();
  return value;
}

export function useClipPlayback() {
  const context = useContext(ClipPlaybackContext);
  if (!context) throw new Error("useClipPlayback must be used inside ClipPlaybackProvider");
  return context;
}

export function ClipPlaybackProvider({
  children,
  initialConsentSnapshot,
}: {
  children: ReactNode;
  initialConsentSnapshot: string;
}) {
  const { locale } = useI18n();
  const {
    claim,
    foregroundPlayback,
    isCurrentClaim,
    registerAdapter,
    release,
  } = usePlaybackCoordinator();
  const consentSnapshot = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    () => initialConsentSnapshot,
  );
  const canLoadYouTube = marketingAllowed(consentSnapshot);
  const anchorsRef = useRef(new Map<string, Set<HTMLElement>>());
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const pendingClaimRef = useRef(0);
  const activeClipRef = useRef<ClipPlaybackDescriptor | null>(null);
  const canLoadRef = useRef(canLoadYouTube);
  const [activeClip, setActiveClip] = useState<ClipPlaybackDescriptor | null>(null);
  const [status, setStatus] = useState<ClipPlaybackStatus>("idle");
  const [iframeInitialId, setIframeInitialId] = useState<string | null>(null);
  const [iframeSession, setIframeSession] = useState(0);
  const [anchorVersion, setAnchorVersion] = useState(0);
  const [playerRect, setPlayerRect] = useState<PlayerRect | null>(null);
  const [attached, setAttached] = useState(false);

  useEffect(() => {
    activeClipRef.current = activeClip;
  }, [activeClip]);

  useEffect(() => {
    canLoadRef.current = canLoadYouTube;
  }, [canLoadYouTube]);

  const pauseClip = useCallback(() => {
    pendingClaimRef.current = -1;
    playerRef.current?.pauseVideo();
    setStatus((current) => current === "idle" || current === "error" ? current : "paused");
  }, []);

  const closeClip = useCallback(() => {
    playerRef.current?.destroy();
    playerRef.current = null;
    pendingClaimRef.current = 0;
    activeClipRef.current = null;
    setActiveClip(null);
    setIframeInitialId(null);
    setPlayerRect(null);
    setAttached(false);
    setStatus("idle");
    release("clip");
  }, [release]);

  useEffect(() => registerAdapter("clip", { pause: pauseClip }), [pauseClip, registerAdapter]);

  const playClip = useCallback((clip: ClipPlaybackDescriptor) => {
    if (!clip.youtubeId) return false;
    if (!canLoadRef.current) {
      window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
      return false;
    }

    const claimId = claim("clip");
    pendingClaimRef.current = claimId;
    activeClipRef.current = clip;
    setActiveClip(clip);
    setStatus("loading");

    if (playerRef.current && iframeInitialId) {
      playerRef.current.loadVideoById(clip.youtubeId);
    } else {
      setIframeInitialId(clip.youtubeId);
      setIframeSession((current) => current + 1);
    }
    return true;
  }, [claim, iframeInitialId]);

  const resumeClip = useCallback(() => {
    const clip = activeClipRef.current;
    if (!clip?.youtubeId) return;
    if (!canLoadRef.current) {
      window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
      return;
    }
    const claimId = claim("clip");
    pendingClaimRef.current = claimId;
    setStatus("loading");
    if (playerRef.current) playerRef.current.playVideo();
    else playClip(clip);
  }, [claim, playClip]);

  const toggleClip = useCallback((clip: ClipPlaybackDescriptor) => {
    const sameClip = activeClipRef.current?.slug === clip.slug;
    if (!sameClip) {
      playClip(clip);
      return;
    }
    if (status === "playing" || status === "loading") pauseClip();
    else if (status === "ended") {
      playerRef.current?.seekTo(0, true);
      resumeClip();
    } else resumeClip();
  }, [pauseClip, playClip, resumeClip, status]);

  const registerClipAnchor = useCallback((clip: ClipPlaybackDescriptor, element: HTMLElement) => {
    const anchors = anchorsRef.current.get(clip.slug) ?? new Set<HTMLElement>();
    anchors.add(element);
    anchorsRef.current.set(clip.slug, anchors);
    setAnchorVersion((current) => current + 1);

    return () => {
      const currentAnchors = anchorsRef.current.get(clip.slug);
      currentAnchors?.delete(element);
      if (currentAnchors?.size === 0) anchorsRef.current.delete(clip.slug);
      setAnchorVersion((current) => current + 1);
    };
  }, []);

  useEffect(() => {
    if (!iframeInitialId || !activeClipRef.current?.youtubeId || !canLoadYouTube || !iframeRef.current) return;
    let cancelled = false;
    const iframe = iframeRef.current;

    void loadYouTubeApi().then((YT) => {
      if (cancelled || !iframe.isConnected || !activeClipRef.current) return;
      const player = new YT.Player(iframe, {
        events: {
          onReady: (event) => {
            playerRef.current = event.target;
            const clip = activeClipRef.current;
            const claimId = pendingClaimRef.current;
            if (!clip?.youtubeId || !isCurrentClaim("clip", claimId)) {
              event.target.pauseVideo();
              setStatus("paused");
              return;
            }
            if (clip.youtubeId !== iframeInitialId) event.target.loadVideoById(clip.youtubeId);
            else event.target.playVideo();
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) setStatus("playing");
            else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.CUED) setStatus("paused");
            else if (event.data === YT.PlayerState.BUFFERING) setStatus("loading");
            else if (event.data === YT.PlayerState.ENDED) setStatus("ended");
          },
          onError: () => setStatus("error"),
          onAutoplayBlocked: () => setStatus("paused"),
        },
      });
      playerRef.current = player;
    }).catch(() => {
      if (!cancelled) setStatus("error");
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [iframeInitialId, iframeSession, canLoadYouTube, isCurrentClaim]);

  useEffect(() => {
    if (canLoadYouTube || !activeClipRef.current) return;
    closeClip();
    unloadYouTubeApi();
  }, [canLoadYouTube, closeClip]);

  useEffect(() => {
    if (!activeClip || foregroundPlayback !== "clip") return;
    let frame = 0;
    let resizeObserver: ResizeObserver | null = null;
    const observed = new Set<Element>();
    let safeAreaBottom = readSafeAreaBottom();

    const measure = () => {
      frame = 0;
      const candidates = [...(anchorsRef.current.get(activeClip.slug) ?? [])]
        .filter((element) => element.isConnected)
        .map((element) => ({ element, rect: element.getBoundingClientRect() }))
        .filter(({ rect }) => rect.width > 0 && rect.height > 0)
        .sort((left, right) => intersectionRatio(right.rect) - intersectionRatio(left.rect));
      const visible = candidates.find(({ rect }) => intersectionRatio(rect) >= ATTACHMENT_RATIO);

      if (visible) {
        const nextRect = {
          left: visible.rect.left,
          top: visible.rect.top,
          width: visible.rect.width,
          height: visible.rect.height,
        };
        setAttached(true);
        setPlayerRect((current) => equalRect(current, nextRect) ? current : nextRect);
        return;
      }

      const desktop = window.innerWidth >= 640;
      const inset = desktop ? 20 : 10;
      const width = desktop
        ? Math.min(360, window.innerWidth - inset * 2)
        : Math.min(200, Math.max(144, window.innerWidth * .44));
      const height = width * 9 / 16;
      let bottom = Math.max(inset, safeAreaBottom + inset);
      const shortlist = document.querySelector<HTMLElement>("[data-shortlist-trigger]");
      if (shortlist) {
        const bounds = shortlist.getBoundingClientRect();
        bottom = Math.max(bottom, window.innerHeight - bounds.top + 12);
      }
      const nextRect = {
        left: window.innerWidth - inset - width,
        top: window.innerHeight - bottom - height,
        width,
        height,
      };
      setAttached(false);
      setPlayerRect((current) => equalRect(current, nextRect) ? current : nextRect);
    };

    const scheduleMeasure = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    resizeObserver = new ResizeObserver(scheduleMeasure);
    for (const element of anchorsRef.current.get(activeClip.slug) ?? []) {
      resizeObserver.observe(element);
      observed.add(element);
    }
    const shortlist = document.querySelector<HTMLElement>("[data-shortlist-trigger]");
    if (shortlist && !observed.has(shortlist)) resizeObserver.observe(shortlist);
    window.addEventListener("scroll", scheduleMeasure, { passive: true });
    const onResize = () => {
      safeAreaBottom = readSafeAreaBottom();
      scheduleMeasure();
    };
    window.addEventListener("resize", onResize);
    scheduleMeasure();

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", onResize);
      resizeObserver?.disconnect();
    };
  }, [activeClip, anchorVersion, foregroundPlayback]);

  const value = useMemo<ClipPlaybackContextValue>(() => ({
    activeClip,
    status,
    closeClip,
    pauseClip,
    playClip,
    registerClipAnchor,
    resumeClip,
    toggleClip,
  }), [
    activeClip,
    closeClip,
    pauseClip,
    playClip,
    registerClipAnchor,
    resumeClip,
    status,
    toggleClip,
  ]);

  const visible = Boolean(activeClip && iframeInitialId && playerRect && foregroundPlayback === "clip");
  const playerStyle: CSSProperties | undefined = playerRect ? {
    height: playerRect.height,
    left: playerRect.left,
    top: playerRect.top,
    width: playerRect.width,
  } : undefined;
  const localizedTitle = activeClip?.title[locale] ?? "";

  return (
    <ClipPlaybackContext.Provider value={value}>
      {children}
      {activeClip && iframeInitialId && canLoadYouTube ? (
        <aside
          data-testid="persistent-clip-player"
          data-attached={attached ? "true" : "false"}
          data-status={status}
          aria-label={locale === "fr" ? `Lecteur vidéo : ${localizedTitle}` : `Video player: ${localizedTitle}`}
          className={`fixed z-[59] overflow-hidden rounded-[.8rem] border border-white/18 bg-black text-white shadow-[0_24px_80px_rgba(0,0,0,.4)] transition-[left,top,width,height,opacity,transform] duration-500 motion-reduce:transition-none ${
            visible ? "pointer-events-auto opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
          }`}
          style={playerStyle}
        >
          <iframe
            key={iframeSession}
            ref={iframeRef}
            data-testid="persistent-clip-iframe"
            data-player-instance={`clip-player-${iframeSession}`}
            src={`https://www.youtube-nocookie.com/embed/${iframeInitialId}?enablejsapi=1&origin=${encodeURIComponent(typeof window === "undefined" ? "" : window.location.origin)}&playsinline=1&rel=0`}
            title={localizedTitle}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
          <div className="absolute right-2 top-2 z-[2] flex gap-1.5">
            {status === "ended" ? (
              <button
                type="button"
                onClick={() => {
                  playerRef.current?.seekTo(0, true);
                  resumeClip();
                }}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/72 backdrop-blur-md sm:h-11 sm:w-11"
                aria-label={locale === "fr" ? "Rejouer le clip" : "Replay video"}
              >
                <RotateCcw size={17} />
              </button>
            ) : null}
            <Link
              href={activeClip.href}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/72 backdrop-blur-md sm:h-11 sm:w-11"
              aria-label={locale === "fr" ? `Voir le détail de ${localizedTitle}` : `View ${localizedTitle} details`}
            >
              <ExternalLink size={17} />
            </Link>
            <button
              type="button"
              onClick={closeClip}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/72 backdrop-blur-md sm:h-11 sm:w-11"
              aria-label={locale === "fr" ? "Fermer le lecteur vidéo" : "Close video player"}
            >
              <X size={18} />
            </button>
          </div>
          {status === "error" ? (
            <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-3 bg-black/88 p-6 text-center">
              <p className="text-sm font-semibold">
                {locale === "fr" ? "Cette vidéo ne peut pas être lue ici." : "This video cannot be played here."}
              </p>
              <a
                href={`https://www.youtube.com/watch?v=${activeClip.youtubeId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 border border-white/45 px-4 text-sm font-semibold"
              >
                YouTube
                <ExternalLink size={15} />
              </a>
            </div>
          ) : null}
        </aside>
      ) : null}
    </ClipPlaybackContext.Provider>
  );
}
