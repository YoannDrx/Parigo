"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  ShowreelSoundButton,
  useShowreelAudio,
} from "@/components/providers/ShowreelAudioProvider";

const SHOWREEL_SOURCE = "/videos/garden-of-eden-showreel.mp4";
const SHOWREEL_POSTER = "/images/home/garden-of-eden-poster.jpg";

function TypewriterLine({
  line,
  offset,
  reveal,
  reduceMotion,
}: {
  line: string;
  offset: number;
  reveal: boolean;
  reduceMotion: boolean;
}) {
  return (
    <span aria-hidden="true" className="block whitespace-nowrap pb-[.08em]">
      {Array.from(line).map((character, index) => {
        const isSquare = character === ".";
        return (
          <motion.span
            key={`${character}-${index}`}
            data-testid={isSquare ? "showreel-title-square" : "showreel-title-letter"}
            data-character-index={offset + index}
            className={isSquare
              ? "ml-[.06em] inline-block h-[.17em] w-[.17em] bg-[var(--signal)] align-[.08em] shadow-[0_0_18px_color-mix(in_srgb,var(--signal)_48%,transparent)]"
              : "inline-block"}
            initial={reduceMotion ? false : { opacity: 0, y: isSquare ? 0 : ".1em", scale: isSquare ? .35 : 1 }}
            animate={reveal
              ? { opacity: 1, y: 0, scale: 1 }
              : { opacity: 0, y: isSquare ? 0 : ".1em", scale: isSquare ? .35 : 1 }}
            transition={{
              duration: reduceMotion ? 0 : isSquare ? .24 : .08,
              delay: reduceMotion || !reveal ? 0 : .2 + (offset + index) * .047,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {isSquare ? null : character === " " ? "\u00a0" : character}
          </motion.span>
        );
      })}
    </span>
  );
}

export function ManifestoScrollSection({ locale }: { locale: "fr" | "en" }) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const soundWasCenteredRef = useRef(false);
  const reduceMotion = useReducedMotion();
  const inView = useInView(sectionRef, { amount: .08 });
  const [playbackStarted, setPlaybackStarted] = useState(false);
  const [revealFallbackElapsed, setRevealFallbackElapsed] = useState(false);
  const {
    detach,
    clearReattachOrigin,
    docked,
    getCurrentTime,
    hasStarted,
    isPlaying,
    muted,
    reattachOrigin,
    registerSection,
    start,
    suppressedByCatalog,
  } = useShowreelAudio();
  const titleLines = locale === "fr"
    ? ["Une musique", "juste.", "Au bon moment.", "Pour la bonne", "image."]
    : ["The right music.", "At the right moment.", "For the right image."];
  const reveal = Boolean(reduceMotion) || (inView && (playbackStarted || revealFallbackElapsed));

  useEffect(() => {
    if (!inView || playbackStarted || revealFallbackElapsed) return;
    const timeout = window.setTimeout(() => setRevealFallbackElapsed(true), 1_200);
    return () => window.clearTimeout(timeout);
  }, [inView, playbackStarted, revealFallbackElapsed]);

  useEffect(() => {
    registerSection(sectionRef.current);
    return () => registerSection(null);
  }, [registerSection]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduceMotion) return;
    if (!inView) {
      video.pause();
      return;
    }

    const syncAndPlay = async () => {
      const persistentTime = getCurrentTime();
      if (Number.isFinite(persistentTime) && persistentTime > 0) {
        try { video.currentTime = persistentTime; } catch {}
      }
      try {
        await video.play();
        setPlaybackStarted(true);
      } catch {
        setPlaybackStarted(false);
      }
      await start();
    };
    void syncAndPlay();
  }, [getCurrentTime, inView, reduceMotion, start]);

  useEffect(() => {
    const updateSoundDock = () => {
      const section = sectionRef.current;
      if (!section) return;
      const bounds = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const isCentered = bounds.top <= viewportHeight * .1 && bounds.bottom >= viewportHeight * .9;
      if (isCentered) {
        soundWasCenteredRef.current = true;
      } else if (
        soundWasCenteredRef.current
        && docked
        && isPlaying
        && !muted
        && (bounds.top >= viewportHeight * .035 || bounds.bottom <= viewportHeight * .72)
      ) {
        detach();
      }
    };
    updateSoundDock();
    window.addEventListener("scroll", updateSoundDock, { passive: true });
    window.addEventListener("resize", updateSoundDock);
    return () => {
      window.removeEventListener("scroll", updateSoundDock);
      window.removeEventListener("resize", updateSoundDock);
    };
  }, [detach, docked, isPlaying, muted]);

  return (
    <div className="relative">
      <section
          ref={sectionRef}
          data-testid="home-showreel"
          className="home-showreel relative isolate h-[100svh] w-full overflow-hidden bg-black text-white md:h-[100dvh]"
        >
        <video
          ref={videoRef}
          data-testid="home-showreel-video"
          src={SHOWREEL_SOURCE}
          poster={SHOWREEL_POSTER}
          preload="metadata"
          loop
          playsInline
          muted
          onLoadedMetadata={(event) => {
            const persistentTime = getCurrentTime();
            if (persistentTime > 0) event.currentTarget.currentTime = persistentTime;
          }}
          onPlay={() => setPlaybackStarted(true)}
          className="absolute inset-0 h-full w-full object-cover"
          aria-label={locale === "fr" ? "Showreel Garden of Eden" : "Garden of Eden showreel"}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.18),transparent_36%,rgba(0,0,0,.34))]" />
        <div className="relative z-10 mx-auto flex h-full max-w-[1800px] items-center px-4 py-20 sm:px-6 lg:px-10">
          <h2
            aria-label={titleLines.join(" ")}
            className="text-[clamp(2.4rem,12.5vw,4rem)] font-semibold leading-[.82] tracking-[-.07em] text-white mix-blend-difference [text-shadow:0_1px_18px_rgba(0,0,0,.14)] sm:text-[clamp(4rem,7.8vw,10rem)]"
          >
            {titleLines.map((line, index) => (
              <TypewriterLine
                key={line}
                line={line}
                offset={titleLines.slice(0, index).reduce((total, item) => total + item.length, 0)}
                reveal={reveal}
                reduceMotion={Boolean(reduceMotion)}
              />
            ))}
          </h2>
        </div>
      </section>
      {hasStarted && docked && !suppressedByCatalog && (
        <motion.div
            key="showreel-sound-control"
            layoutId="showreel-sound-control"
            layout="position"
            data-testid="showreel-sound-position"
            className="absolute bottom-5 right-4 z-20 sm:bottom-7 sm:right-7"
            initial={reattachOrigin
              ? { opacity: 1, scale: 1, x: reattachOrigin.x, y: reattachOrigin.y }
              : { opacity: 0, scale: .94, x: 0, y: 0 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: .88 }}
            onAnimationComplete={clearReattachOrigin}
            transition={{
              layout: { type: "spring", stiffness: 72, damping: 20, mass: 1.15 },
              x: { type: "spring", stiffness: 72, damping: 20, mass: 1.15 },
              y: { type: "spring", stiffness: 72, damping: 20, mass: 1.15 },
              opacity: { duration: .25 },
              scale: { duration: .42, ease: [0.22, 1, 0.36, 1] },
            }}
        >
          <ShowreelSoundButton floating={false} />
        </motion.div>
      )}
    </div>
  );
}
