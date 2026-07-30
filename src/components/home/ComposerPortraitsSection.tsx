"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SignedTitle } from "@/components/ui/SignedTitle";
import type { ComposerProfile } from "@/lib/editorial/contracts";
import { localizedPath } from "@/lib/locale";

export type HomeComposerProfile = Pick<
  ComposerProfile,
  "slug" | "name" | "image" | "bio" | "kind" | "grammaticalGender"
>;

function excerpt(value: string | undefined, locale: "fr" | "en") {
  if (!value) return locale === "fr"
    ? "Une écriture singulière, façonnée au contact des images et des récits."
    : "A singular musical voice shaped through images and stories.";
  const firstSentence = value.match(/^(.{80,260}?[.!?])(?:\s|$)/)?.[1] ?? value.slice(0, 230);
  return `${firstSentence.trim()}${firstSentence.length < value.length && !/[.!?]$/.test(firstSentence) ? "…" : ""}`;
}

export function ComposerPortraitsSection({
  profiles,
  locale,
}: {
  profiles: HomeComposerProfile[];
  locale: "fr" | "en";
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const previousScrollYRef = useRef(0);
  const visualAnchorTopRef = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [stickyCompleted, setStickyCompleted] = useState(false);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const activeProfile = profiles[activeIndex] ?? profiles[0];

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    if (reduceMotion || stickyCompleted || profiles.length < 2) return;
    const nextIndex = Math.min(profiles.length - 1, Math.floor(Math.min(.999, progress) * profiles.length));
    setActiveIndex((current) => current === nextIndex ? current : nextIndex);
  });

  useEffect(() => {
    previousScrollYRef.current = window.scrollY;
    if (reduceMotion || stickyCompleted) return;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > previousScrollYRef.current;
      previousScrollYRef.current = currentScrollY;
      const section = sectionRef.current;
      if (!section || !isScrollingDown || section.getBoundingClientRect().bottom > 1) return;
      visualAnchorTopRef.current = section.nextElementSibling?.getBoundingClientRect().top ?? null;
      setActiveIndex(profiles.length - 1);
      setStickyCompleted(true);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [profiles.length, reduceMotion, stickyCompleted]);

  useLayoutEffect(() => {
    if (!stickyCompleted || visualAnchorTopRef.current === null) return;
    const section = sectionRef.current;
    const previousAnchorTop = visualAnchorTopRef.current;
    visualAnchorTopRef.current = null;
    const currentAnchorTop = section?.nextElementSibling?.getBoundingClientRect().top;
    if (currentAnchorTop === undefined) return;
    const visualDelta = currentAnchorTop - previousAnchorTop;
    if (Math.abs(visualDelta) > 1) {
      window.scrollBy({ top: visualDelta, behavior: "instant" });
    }
  }, [stickyCompleted]);

  if (!activeProfile) return null;

  return (
    <section
      ref={sectionRef}
      data-testid="home-composers"
      data-active-composer={activeProfile.slug}
      data-sticky-completed={stickyCompleted ? "true" : "false"}
      className={`relative bg-[var(--surface)] ${reduceMotion || stickyCompleted ? "h-[100svh] md:h-[100dvh]" : "h-[280svh] md:h-[280dvh]"}`}
    >
      <div
        data-testid="composer-sticky-stage"
        className={`${reduceMotion || stickyCompleted ? "relative" : "sticky top-0"} h-[100svh] overflow-hidden px-4 py-4 sm:px-6 sm:py-6 md:h-[100dvh] md:px-8 md:py-8`}
      >
        <div className="mx-auto flex h-full max-w-[1580px] flex-col">
          <header className="shrink-0 pb-4 md:pb-6">
            <SignedTitle as="h2" className="max-w-[20ch] text-[clamp(1.9rem,7.5vw,5.5rem)] font-semibold leading-[.92] tracking-[-.055em] text-[var(--foreground)] sm:text-[clamp(2.25rem,5vw,5.5rem)]">
              <span className="composer-title-line block whitespace-nowrap">
                {locale === "fr" ? "La musique commence" : "Music begins"}
              </span>{" "}
              <span className="composer-title-line inline whitespace-nowrap">
                {locale === "fr" ? "par une rencontre" : "with a meeting"}
              </span>
            </SignedTitle>
          </header>

          <div className="relative min-h-0 flex-1 rounded-[16px_14px] border border-[var(--line-strong)] bg-[var(--surface)] p-[5px] shadow-[8px_9px_0_color-mix(in_srgb,var(--signal)_10%,transparent)]">
            <div data-testid="composer-stage" className="relative grid h-full min-h-0 grid-rows-[minmax(0,1.18fr)_minmax(0,.82fr)] overflow-hidden rounded-[12px_10px] border border-white/14 bg-[#0b0e0c] text-white md:grid-cols-12 md:grid-rows-1">
              <motion.div
                aria-hidden="true"
                style={{ scaleX: reduceMotion ? 1 : scrollYProgress }}
                className="absolute inset-x-0 top-0 z-30 h-[3px] origin-left bg-[var(--signal)]"
              />
              <span aria-hidden="true" className="absolute right-3 top-3 z-30 h-8 w-8 rounded-tr-[10px] border-r-2 border-t-2 border-[var(--signal)] md:right-5 md:top-5 md:h-12 md:w-12" />
              <span aria-hidden="true" className="absolute bottom-3 left-3 z-30 h-8 w-8 rounded-bl-[10px] border-b-2 border-l-2 border-[var(--signal)] md:bottom-5 md:left-5 md:h-12 md:w-12" />

              <div className="relative min-h-0 overflow-hidden md:col-span-7">
                <AnimatePresence initial={false}>
                  <motion.div
                    key={activeProfile.slug}
                    data-testid="composer-stage-portrait"
                    initial={reduceMotion ? false : { opacity: 0, clipPath: "inset(100% 0 0 0)", scale: 1.08 }}
                    animate={{ opacity: 1, clipPath: "inset(0 0 0 0)", scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, clipPath: "inset(0 0 100% 0)", scale: .98 }}
                    transition={{ duration: reduceMotion ? 0 : .82, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={activeProfile.image}
                      alt={activeProfile.name}
                      fill
                      priority={activeIndex === 0}
                      sizes="(max-width: 768px) 100vw, 58vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/48 via-transparent to-black/10" />
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="relative flex min-h-0 flex-col border-t border-white/14 px-5 py-4 md:col-span-5 md:border-l md:border-t-0 md:px-8 md:py-8 lg:px-12 lg:py-10">
                <span aria-hidden="true" className="pointer-events-none absolute -right-3 -top-8 text-[clamp(7rem,15vw,15rem)] font-semibold leading-none tracking-[-.1em] text-white/[.035]">
                  {String(activeIndex + 1).padStart(2, "0")}
                </span>
                <div className="relative my-auto min-h-0">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={activeProfile.slug}
                      initial={reduceMotion ? false : { opacity: 0, y: 34, filter: "blur(10px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -24, filter: "blur(7px)" }}
                      transition={{ duration: reduceMotion ? 0 : .58, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <h3 className="text-[clamp(2.35rem,5.8vw,6.7rem)] font-semibold leading-[.82] tracking-[-.065em] text-white">
                        {activeProfile.name}
                      </h3>
                      <p className="mt-3 line-clamp-2 max-w-lg text-xs leading-5 text-white/64 sm:text-sm sm:leading-6 md:mt-6 md:line-clamp-4 md:text-base md:leading-7">
                        {excerpt(activeProfile.bio[locale] || activeProfile.bio.fr || activeProfile.bio.en, locale)}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <nav aria-label={locale === "fr" ? "Compositeurs mis en avant" : "Featured composers"} className="relative mt-3 grid shrink-0 grid-cols-2 border border-white/14 md:mt-6">
                  {profiles.map((profile, index) => (
                    <Link
                      key={profile.slug}
                      href={localizedPath(locale, `/compositeurs/${profile.slug}`)}
                      onMouseEnter={() => setActiveIndex(index)}
                      onFocus={() => setActiveIndex(index)}
                      aria-current={index === activeIndex ? "true" : undefined}
                      className={`group flex min-h-10 min-w-0 items-center justify-between gap-2 border-b border-r border-white/14 px-2 text-[.58rem] font-semibold transition even:border-r-0 [&:nth-last-child(-n+2)]:border-b-0 sm:px-3 sm:text-[.68rem] ${
                        index === activeIndex
                          ? "bg-[#173822] text-[#f6fff8] shadow-[inset_3px_0_0_var(--signal)]"
                          : "bg-white/[.025] text-[#c7cec8] hover:bg-white/[.07] hover:text-white"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${index === activeIndex ? "bg-[var(--signal)]" : "bg-white/20"}`} />
                        <span className="truncate">{profile.name}</span>
                      </span>
                      <ArrowUpRight size={12} className="hidden shrink-0 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:block" />
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
