"use client";

import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

const MOBILE_SCROLL_MEDIA = "(max-width: 1023px), (hover: none) and (pointer: coarse)";

export function ManifestoScrollSection({ locale }: { locale: "fr" | "en" }) {
  const sectionRef = useRef<HTMLElement>(null);
  const completedRef = useRef(false);
  const completionPendingRef = useRef(false);
  const completionTimerRef = useRef<number | null>(null);
  const [completed, setCompleted] = useState(false);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const furthestProgress = useMotionValue(0);

  const completePreservingAnchor = useCallback(() => {
    if (completedRef.current) return;
    const section = sectionRef.current;
    if (!section) return;

    const anchor = section.nextElementSibling as HTMLElement | null;
    const anchorTopBefore = anchor?.getBoundingClientRect().top ?? section.getBoundingClientRect().bottom;
    completedRef.current = true;
    completionPendingRef.current = false;
    furthestProgress.set(1);

    flushSync(() => setCompleted(true));

    const preserveAnchor = () => {
      const anchorTopAfter = anchor?.getBoundingClientRect().top ?? section.getBoundingClientRect().bottom;
      const correction = anchorTopAfter - anchorTopBefore;
      if (Math.abs(correction) > .5) window.scrollBy(0, correction);
    };

    preserveAnchor();
    window.requestAnimationFrame(preserveAnchor);
  }, [furthestProgress]);

  const scheduleMobileCompletion = useCallback(() => {
    if (completionTimerRef.current) window.clearTimeout(completionTimerRef.current);
    completionTimerRef.current = window.setTimeout(() => {
      completionTimerRef.current = null;
      if (scrollYProgress.get() < .99) {
        completionPendingRef.current = false;
        return;
      }
      completePreservingAnchor();
    }, 180);
  }, [completePreservingAnchor, scrollYProgress]);

  useEffect(() => {
    const rescheduleWhileScrolling = () => {
      if (completionPendingRef.current && !completedRef.current) scheduleMobileCompletion();
    };
    window.addEventListener("scroll", rescheduleWhileScrolling, { passive: true });
    return () => {
      window.removeEventListener("scroll", rescheduleWhileScrolling);
      if (completionTimerRef.current) window.clearTimeout(completionTimerRef.current);
    };
  }, [scheduleMobileCompletion]);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (completedRef.current) return;
    if (latest > furthestProgress.get()) furthestProgress.set(latest);
    if (latest < .995 || completionPendingRef.current) return;
    furthestProgress.set(1);
    if (window.matchMedia(MOBILE_SCROLL_MEDIA).matches) {
      completionPendingRef.current = true;
      scheduleMobileCompletion();
      return;
    }
    completePreservingAnchor();
  });
  const reveal = useTransform(furthestProgress, [.1, .91], ["inset(0 100% 0 0)", "inset(0 0% 0 0)"]);
  const revealEdge = useTransform(furthestProgress, [.1, .91], ["0%", "100%"]);
  const copyY = useTransform(furthestProgress, [.5, .82], [32, 0]);
  const copyOpacity = useTransform(furthestProgress, [.5, .75], [0, 1]);
  const titleLines = locale === "fr"
    ? ["Une musique juste.", "Au bon moment.", "Pour la bonne image."]
    : ["The right music.", "At the right moment.", "For the right image."];

  const title = (className: string) => (
    <h2 className={className}>
      {titleLines.map((line) => <span key={line} className="block md:whitespace-nowrap">{line}</span>)}
    </h2>
  );

  return (
    <section id="manifesto" ref={sectionRef} data-reveal-completed={completed} className={reduceMotion ? "relative min-h-[100svh] overflow-clip bg-[var(--background)] md:min-h-screen" : "relative min-h-[225svh] overflow-clip bg-[var(--background)] md:min-h-[235svh]"}>
      <div className={completed ? "relative flex min-h-[100svh] w-full items-center overflow-hidden py-10 md:min-h-screen md:py-16" : "sticky top-0 flex min-h-[100svh] w-full items-center overflow-hidden py-10 md:min-h-screen md:py-16"}>
        <div className="relative z-10 w-full px-3 md:px-8">
          <div className="mx-auto max-w-[1580px] text-left lg:text-center">
            <p className="eyebrow text-[var(--signal-strong)]">Parigo / {locale === "fr" ? "Manifeste" : "Manifesto"}</p>
            <div className="relative mt-8 md:mt-7">
              {completed ? title("text-[clamp(4rem,17vw,5.8rem)] font-semibold uppercase leading-[.8] tracking-[-.075em] text-[var(--foreground)] lg:text-[clamp(2.25rem,6.3vw,7rem)] lg:leading-[.9] lg:tracking-[-.06em]") : <>
                {title("select-none text-[clamp(4rem,17vw,5.8rem)] font-semibold uppercase leading-[.8] tracking-[-.075em] text-transparent lg:text-[clamp(2.25rem,6.3vw,7rem)] lg:leading-[.9] lg:tracking-[-.06em]")}
                <motion.div aria-hidden="true" style={reduceMotion ? { clipPath: "inset(0 0 0 0)" } : { clipPath: reveal }} className="absolute inset-0">
                  {title("text-[clamp(4rem,17vw,5.8rem)] font-semibold uppercase leading-[.8] tracking-[-.075em] text-[var(--foreground)] lg:text-[clamp(2.25rem,6.3vw,7rem)] lg:leading-[.9] lg:tracking-[-.06em]")}
                </motion.div>
                {!reduceMotion && <motion.span data-testid="manifesto-reveal-edge" aria-hidden="true" style={{ left: revealEdge }} className="pointer-events-none absolute -inset-y-8 w-[2px] -translate-x-1/2 bg-[var(--signal)] shadow-[0_0_12px_color-mix(in_srgb,var(--signal)_58%,transparent),0_0_52px_18px_color-mix(in_srgb,var(--signal)_15%,transparent)]" />}
              </>}
            </div>
            <motion.div style={reduceMotion || completed ? undefined : { y: copyY, opacity: copyOpacity }} className="mt-8 max-w-2xl border-t border-[var(--signal)] pt-5 lg:mx-auto lg:mt-10 lg:pt-6">
              <p className="text-sm leading-7 text-[var(--text-muted)] md:text-base">{locale === "fr" ? "Parigo accompagne chaque année plusieurs centaines d’heures de programmes audiovisuels, du cinéma à la publicité, avec une même exigence éditoriale." : "Every year, Parigo supports hundreds of hours of audiovisual programmes, from cinema to advertising, with the same editorial standards."}</p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
