"use client";

import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";

export function ManifestoScrollSection({ locale }: { locale: "fr" | "en" }) {
  const sectionRef = useRef<HTMLElement>(null);
  const completingRef = useRef(false);
  const [completed, setCompleted] = useState(false);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const furthestProgress = useMotionValue(0);
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (completed) return;
    if (latest > furthestProgress.get()) furthestProgress.set(latest);
    if (latest < .995 || completingRef.current) return;
    const section = sectionRef.current;
    if (!section) return;
    completingRef.current = true;
    const previousHeight = section.offsetHeight;
    const sectionTop = section.offsetTop;
    furthestProgress.set(1);
    setCompleted(true);
    window.requestAnimationFrame(() => {
      const nextHeight = section.offsetHeight;
      const heightDelta = Math.max(0, previousHeight - nextHeight);
      if (heightDelta > 0 && window.scrollY > sectionTop) {
        window.scrollTo({ top: Math.max(sectionTop, window.scrollY - heightDelta), behavior: "instant" });
      }
    });
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
    <section id="manifesto" ref={sectionRef} data-reveal-completed={completed} className={completed ? "relative min-h-screen overflow-clip bg-[var(--background)]" : "relative min-h-[190svh] overflow-clip bg-[var(--background)] md:min-h-[235svh]"}>
      <div className={completed ? "relative flex min-h-screen w-full items-center overflow-hidden py-16" : "sticky top-0 flex min-h-screen w-full items-center overflow-hidden py-16"}>
        <div className="relative z-10 w-full px-4 md:px-8">
          <div className="mx-auto max-w-[1580px] text-center">
            <p className="eyebrow text-[var(--signal-strong)]">Parigo / Manifesto</p>
            <div className="relative mt-7">
              {completed ? title("text-[clamp(2.25rem,6.3vw,7rem)] font-semibold uppercase leading-[.9] tracking-[-.06em] text-[var(--foreground)]") : <>
                {title("select-none text-[clamp(2.25rem,6.3vw,7rem)] font-semibold uppercase leading-[.9] tracking-[-.06em] text-transparent")}
                <motion.div aria-hidden="true" style={reduceMotion ? { clipPath: "inset(0 0 0 0)" } : { clipPath: reveal }} className="absolute inset-0">
                  {title("text-[clamp(2.25rem,6.3vw,7rem)] font-semibold uppercase leading-[.9] tracking-[-.06em] text-[var(--foreground)]")}
                </motion.div>
                {!reduceMotion && <motion.span data-testid="manifesto-reveal-edge" aria-hidden="true" style={{ left: revealEdge }} className="pointer-events-none absolute -inset-y-8 w-[2px] -translate-x-1/2 bg-[var(--signal)] shadow-[0_0_12px_color-mix(in_srgb,var(--signal)_58%,transparent),0_0_52px_18px_color-mix(in_srgb,var(--signal)_15%,transparent)]" />}
              </>}
            </div>
            <motion.div style={reduceMotion || completed ? undefined : { y: copyY, opacity: copyOpacity }} className="mx-auto mt-10 max-w-2xl border-t border-[var(--signal)] pt-6">
              <p className="text-sm leading-7 text-[var(--text-muted)] md:text-base">{locale === "fr" ? "Parigo accompagne chaque année plusieurs centaines d’heures de programmes audiovisuels, du cinéma à la publicité, avec une même exigence éditoriale." : "Every year, Parigo supports hundreds of hours of audiovisual programmes, from cinema to advertising, with the same editorial standards."}</p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
