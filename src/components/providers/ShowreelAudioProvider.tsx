"use client";

import { LayoutGroup, motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePlayerStore } from "@/stores/player-store";
import { useShortlistStore } from "@/stores/shortlist-store";
import { useI18n } from "./I18nProvider";
import { usePlaybackCoordinator } from "./PlaybackCoordinatorProvider";

const SHOWREEL_SOURCE = "/videos/garden-of-eden-showreel.mp4";

interface StartOptions {
  explicit?: boolean;
}

interface ShowreelAudioContextValue {
  docked: boolean;
  hasStarted: boolean;
  isPlaying: boolean;
  muted: boolean;
  reattachOrigin: { x: number; y: number } | null;
  suppressedByCatalog: boolean;
  clearReattachOrigin: () => void;
  detach: () => void;
  getCurrentTime: () => number;
  registerSection: (section: HTMLElement | null) => void;
  start: (options?: StartOptions) => Promise<boolean>;
  toggleSound: () => Promise<void>;
}

const ShowreelAudioContext = createContext<ShowreelAudioContextValue | null>(null);

export function useShowreelAudio() {
  const context = useContext(ShowreelAudioContext);
  if (!context) throw new Error("useShowreelAudio must be used inside ShowreelAudioProvider");
  return context;
}

export function ShowreelSoundButton({ floating }: { floating: boolean }) {
  const { locale } = useI18n();
  const { isPlaying, muted, toggleSound } = useShowreelAudio();
  const audible = isPlaying && !muted;

  return (
    <button
      type="button"
      onClick={() => void toggleSound()}
      data-floating={floating ? "true" : "false"}
      className={`relative grid h-14 w-14 place-items-center overflow-visible rounded-full border-2 text-white shadow-[0_12px_42px_rgba(0,0,0,.4)] backdrop-blur-md transition duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
        audible
          ? "border-white/80 bg-[var(--signal-strong)] hover:border-white hover:bg-[var(--signal)]"
          : "border-white/60 bg-black/68 hover:border-white hover:bg-black/85"
      }`}
      aria-label={audible
        ? (locale === "fr" ? "Couper le son" : "Mute sound")
        : (locale === "fr" ? "Activer le son" : "Turn sound on")}
    >
      {audible ? (
        <>
          <span aria-hidden="true" className="absolute inset-0 rounded-full border border-white/65 animate-ping [animation-duration:1.8s]" />
          <motion.span
            data-testid="showreel-sound-active"
            className="relative"
            animate={{ rotate: [0, -9, 8, -4, 0], scale: [1, 1.14, 1, 1.08, 1] }}
            transition={{ duration: 1.15, repeat: Infinity, repeatDelay: .35, ease: "easeInOut" }}
          >
            <Volume2 size={21} />
          </motion.span>
        </>
      ) : <VolumeX size={20} />}
    </button>
  );
}

export function ShowreelAudioProvider({ children }: { children: ReactNode }) {
  const {
    claim,
    foregroundPlayback,
    isCurrentClaim,
    registerAdapter,
    release,
  } = usePlaybackCoordinator();
  const audioRef = useRef<HTMLAudioElement>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [docked, setDocked] = useState(true);
  const [suppressedByCatalog, setSuppressedByCatalog] = useState(false);
  const [floatingBottom, setFloatingBottom] = useState(20);
  const [floatingOrigin, setFloatingOrigin] = useState<{ x: number; y: number } | null>(null);
  const [reattachOrigin, setReattachOrigin] = useState<{ x: number; y: number } | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const mutedRef = useRef(muted);
  const suppressedByCatalogRef = useRef(suppressedByCatalog);
  const passiveStartAttemptedRef = useRef(false);
  const manuallyStoppedRef = useRef(false);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const shortlistItems = useShortlistStore((state) => state.items.length);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    mutedRef.current = muted;
    suppressedByCatalogRef.current = suppressedByCatalog;
  }, [isPlaying, muted, suppressedByCatalog]);

  const registerSection = useCallback((section: HTMLElement | null) => {
    sectionRef.current = section;

    if (!section) {
      if (isPlayingRef.current && !mutedRef.current) setDocked(false);
      return;
    }

    if (manuallyStoppedRef.current) setDocked(true);
    if (!foregroundPlayback && suppressedByCatalogRef.current) {
      setSuppressedByCatalog(false);
      setDocked(true);
    }
  }, [foregroundPlayback]);

  const start = useCallback(async ({ explicit = false }: StartOptions = {}) => {
    const audio = audioRef.current;
    if (!audio) return false;

    if (!explicit) {
      if (passiveStartAttemptedRef.current) {
        if (manuallyStoppedRef.current) setDocked(true);
        return isPlayingRef.current && !mutedRef.current;
      }
      passiveStartAttemptedRef.current = true;
    } else {
      manuallyStoppedRef.current = false;
    }

    setHasStarted(true);
    if (!explicit && foregroundPlayback && foregroundPlayback !== "showreel") {
      setSuppressedByCatalog(true);
      return false;
    }

    setSuppressedByCatalog(false);
    audio.volume = 1;
    audio.muted = false;
    setMuted(false);

    let claimId = explicit ? claim("showreel") : 0;

    try {
      await audio.play();
      if (!explicit) claimId = claim("showreel");
      if (!isCurrentClaim("showreel", claimId)) {
        audio.pause();
        audio.muted = true;
        setMuted(true);
        setIsPlaying(false);
        return false;
      }
      setIsPlaying(true);
      return true;
    } catch {
      if (explicit) {
        setMuted(true);
        setIsPlaying(false);
        release("showreel");
        return false;
      }

      audio.muted = true;
      setMuted(true);
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
      return false;
    }
  }, [claim, foregroundPlayback, isCurrentClaim, release]);

  const toggleSound = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    const audible = isPlaying && !muted;
    if (audible) {
      manuallyStoppedRef.current = true;
      audio.pause();
      audio.muted = true;
      setMuted(true);
      setIsPlaying(false);
      release("showreel");
      if (sectionRef.current) {
        const control = document.querySelector<HTMLElement>("[data-testid='showreel-sound-position']");
        const sectionBounds = sectionRef.current.getBoundingClientRect();
        const sectionInset = window.innerWidth >= 640 ? 28 : 16;
        const targetX = sectionBounds.right - sectionInset - 56;
        const targetY = sectionBounds.bottom - sectionInset - 56;
        const controlBounds = control?.getBoundingClientRect();
        setReattachOrigin(controlBounds
          ? { x: controlBounds.x - targetX, y: controlBounds.y - targetY }
          : null);
        setDocked(true);
      }
      return;
    }

    await start({ explicit: true });
  }, [isPlaying, muted, release, start]);

  const detach = useCallback(() => {
    if (!isPlaying || muted || manuallyStoppedRef.current) return;
    const control = document.querySelector<HTMLElement>("[data-testid='showreel-sound-position']");
    const controlBounds = control?.getBoundingClientRect();
    const viewportInset = window.innerWidth >= 640 ? 20 : 12;
    const targetX = window.innerWidth - viewportInset - 56;
    const targetY = window.innerHeight - floatingBottom - 56;
    setFloatingOrigin(controlBounds
      ? { x: controlBounds.x - targetX, y: controlBounds.y - targetY }
      : null);
    setDocked(false);
  }, [floatingBottom, isPlaying, muted]);

  const getCurrentTime = useCallback(() => audioRef.current?.currentTime ?? 0, []);
  const clearReattachOrigin = useCallback(() => setReattachOrigin(null), []);

  const pauseForCoordinator = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !isPlayingRef.current) return;
    audio.pause();
    audio.muted = true;
    setMuted(true);
    setIsPlaying(false);
    setSuppressedByCatalog(true);
  }, []);

  useEffect(
    () => registerAdapter("showreel", { pause: pauseForCoordinator }),
    [pauseForCoordinator, registerAdapter],
  );

  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let positionFrame = 0;
    let followUntil = 0;
    const observed = new Set<Element>();

    const measure = () => {
      const baseInset = window.innerWidth >= 640 ? 28 : 20;
      let clearance = baseInset;
      const player = document.querySelector<HTMLElement>("[data-testid='player-dock']");
      const shortlist = document.querySelector<HTMLElement>("[data-shortlist-trigger]");

      if (player) {
        const bounds = player.getBoundingClientRect();
        clearance = Math.max(clearance, window.innerHeight - bounds.top + 12);
      }
      if (shortlist) {
        const bounds = shortlist.getBoundingClientRect();
        clearance = Math.max(clearance, window.innerHeight - bounds.top + 12);
      }
      setFloatingBottom((previous) => Math.abs(previous - clearance) > .5 ? clearance : previous);
    };

    const observeCurrentOverlays = () => {
      for (const element of document.querySelectorAll("[data-testid='player-dock'], [data-shortlist-trigger]")) {
        if (observed.has(element)) continue;
        observed.add(element);
        resizeObserver?.observe(element);
      }
    };

    const followOverlayMotion = () => {
      measure();
      if (performance.now() < followUntil) {
        positionFrame = window.requestAnimationFrame(followOverlayMotion);
      } else {
        positionFrame = 0;
      }
    };

    const scheduleOverlayFollow = () => {
      followUntil = performance.now() + 900;
      if (!positionFrame) positionFrame = window.requestAnimationFrame(followOverlayMotion);
    };

    resizeObserver = new ResizeObserver(measure);
    mutationObserver = new MutationObserver(() => {
      observeCurrentOverlays();
      measure();
      scheduleOverlayFollow();
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", measure);
    observeCurrentOverlays();
    scheduleOverlayFollow();

    return () => {
      window.cancelAnimationFrame(positionFrame);
      window.removeEventListener("resize", measure);
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
    };
  }, [currentTrack, shortlistItems]);

  const value = useMemo<ShowreelAudioContextValue>(() => ({
    docked,
    hasStarted,
    isPlaying,
    muted,
    reattachOrigin,
    suppressedByCatalog,
    clearReattachOrigin,
    detach,
    getCurrentTime,
    registerSection,
    start,
    toggleSound,
  }), [
    clearReattachOrigin,
    detach,
    docked,
    getCurrentTime,
    hasStarted,
    isPlaying,
    muted,
    reattachOrigin,
    registerSection,
    start,
    suppressedByCatalog,
    toggleSound,
  ]);

  const showFloatingControl = hasStarted
    && !docked
    && !suppressedByCatalog
    && foregroundPlayback === "showreel"
    && (isPlaying || muted);

  return (
    <ShowreelAudioContext.Provider value={value}>
      <LayoutGroup id="persistent-showreel-audio">
        {children}
        <audio
          ref={audioRef}
          data-testid="persistent-showreel-audio"
          src={SHOWREEL_SOURCE}
          preload="metadata"
          loop
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
        />
        {showFloatingControl && (
          <motion.div
              key="showreel-floating-sound-control"
              layoutId="showreel-sound-control"
              layout="position"
              data-testid="showreel-sound-position"
              className="fixed right-3 z-[57] sm:right-5"
              style={{ bottom: floatingBottom }}
              initial={floatingOrigin
                ? { opacity: 1, scale: 1, x: floatingOrigin.x, y: floatingOrigin.y }
                : { opacity: 0, scale: .94, x: 0, y: 0 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: .88 }}
              onAnimationComplete={() => setFloatingOrigin(null)}
              transition={{
                layout: { type: "spring", stiffness: 72, damping: 20, mass: 1.15 },
                x: { type: "spring", stiffness: 72, damping: 20, mass: 1.15 },
                y: { type: "spring", stiffness: 72, damping: 20, mass: 1.15 },
                opacity: { duration: .25 },
                scale: { duration: .42, ease: [0.22, 1, 0.36, 1] },
              }}
          >
            <ShowreelSoundButton floating />
          </motion.div>
        )}
      </LayoutGroup>
    </ShowreelAudioContext.Provider>
  );
}
