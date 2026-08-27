"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { SignedTitle } from "@/components/ui/SignedTitle";

const BANNER_REVEAL_EASE = [0, 0.55, 0.45, 1] as const;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const reducedMotionListeners = new Set<() => void>();
let reducedMotionMedia: MediaQueryList | null = null;

function getReducedMotionMedia() {
  reducedMotionMedia ??= window.matchMedia(REDUCED_MOTION_QUERY);
  return reducedMotionMedia;
}

function notifyReducedMotionListeners() {
  reducedMotionListeners.forEach((listener) => listener());
}

function subscribeToReducedMotion(listener: () => void) {
  const media = getReducedMotionMedia();
  if (reducedMotionListeners.size === 0) media.addEventListener("change", notifyReducedMotionListeners);
  reducedMotionListeners.add(listener);
  return () => {
    reducedMotionListeners.delete(listener);
    if (reducedMotionListeners.size === 0) media.removeEventListener("change", notifyReducedMotionListeners);
  };
}

export function useHomeReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => getReducedMotionMedia().matches,
    () => false,
  );
}

type RevealOrigin = "bottom" | "left" | "right" | "top";

export function HomeReveal({
  children,
  className = "",
  origin = "bottom",
  testId,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  origin?: RevealOrigin;
  testId?: string;
  viewportAmount?: number;
}) {
  return (
    <div
      data-testid={testId}
      data-home-reveal="static"
      data-home-reveal-origin={origin}
      className={className}
    >
      {children}
    </div>
  );
}

export function HomeHeroContent({
  descriptionLines,
  search,
  target,
  title,
}: {
  descriptionLines: readonly [string, string];
  search: ReactNode;
  target: RefObject<HTMLElement | null>;
  title: string;
}) {
  const reduceMotion = useHomeReducedMotion();
  const [searchRevealComplete, setSearchRevealComplete] = useState(false);
  const words = title.split(" ");
  const { scrollY } = useScroll();
  const heroProgress = useTransform(scrollY, (currentScrollY) => {
    const element = target.current;
    if (!element) return 0;
    const elementTop = element.getBoundingClientRect().top + currentScrollY;
    const distance = Math.max(element.offsetHeight, 1);
    return Math.min(1, Math.max(0, (currentScrollY - elementTop) / distance));
  });
  const y = useTransform(heroProgress, [0, 1], [0, -116]);
  const scale = useTransform(heroProgress, [0, 1], [1, 0.93]);
  const opacity = useTransform(heroProgress, [0, 0.62], [1, 0]);

  return (
    <motion.div
      data-testid="home-hero-content"
      data-home-hero-motion={reduceMotion ? "static" : "animated"}
      style={reduceMotion ? { y: 0, scale: 1 } : { y, scale }}
      className="pointer-events-none relative mx-auto w-full max-w-[1180px] text-center"
    >
      <motion.div
        data-testid="home-hero-copy"
        style={reduceMotion ? { opacity: 1 } : { opacity }}
      >
        <motion.div
          data-banner-reveal="title"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.16, delay: reduceMotion ? 0 : 0.08 }}
        >
          <SignedTitle className="pointer-events-auto relative z-10 mx-auto max-w-[13ch] text-[clamp(3.4rem,7.2vw,7.5rem)] font-semibold leading-[.9] tracking-[-.065em]">
            <span>
              {words.map((word, index) => (
                <span key={`${word}-${index}`} className="inline-block overflow-hidden pb-[.07em] align-bottom">
                  <motion.span
                    data-testid="home-hero-title-word"
                    data-banner-word={index}
                    className="inline-block"
                    initial={reduceMotion ? false : { opacity: 0, y: "108%" }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.76,
                      delay: reduceMotion ? 0 : 0.12 + index * 0.14,
                      ease: BANNER_REVEAL_EASE,
                    }}
                  >
                    {word}
                  </motion.span>
                  {index < words.length - 1 ? "\u00a0" : null}
                </span>
              ))}
            </span>
          </SignedTitle>
        </motion.div>

        <p
          data-banner-reveal="description"
          className="mx-auto mt-6 max-w-3xl font-[var(--font-rounded)] text-base leading-relaxed text-[var(--text-muted)] md:text-lg"
        >
          {descriptionLines.map((line, index) => (
            <span key={line} className="block overflow-hidden pb-[.08em]">
              <motion.span
                data-testid="home-hero-description-line"
                className="block"
                initial={reduceMotion ? false : { opacity: 0, y: "112%" }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.68,
                  delay: reduceMotion ? 0 : 0.66 + index * 0.12,
                  ease: BANNER_REVEAL_EASE,
                }}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </p>
      </motion.div>

      <motion.div
        data-testid="home-hero-search-mask"
        data-banner-mask={reduceMotion || searchRevealComplete ? "open" : "closed"}
        style={reduceMotion ? { opacity: 1 } : { opacity }}
        className={`pointer-events-auto mx-auto mt-9 min-h-[14.25rem] max-w-4xl text-left ${reduceMotion || searchRevealComplete ? "overflow-visible" : "overflow-hidden"}`}
      >
        <motion.div
          data-testid="home-hero-search-reveal"
          data-banner-reveal="search"
          initial={reduceMotion ? false : { opacity: 0, y: "112%" }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reduceMotion ? 0 : 0.78,
            delay: reduceMotion ? 0 : 0.88,
            ease: BANNER_REVEAL_EASE,
          }}
          onAnimationComplete={() => setSearchRevealComplete(true)}
        >
          {search}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
