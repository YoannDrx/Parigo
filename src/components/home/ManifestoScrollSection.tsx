"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export function ManifestoScrollSection({ locale }: { locale: "fr" | "en" }) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const reveal = useTransform(scrollYProgress, [.08, .82], ["inset(0 100% 0 0)", "inset(0 0% 0 0)"]);
  const revealEdge = useTransform(scrollYProgress, [.08, .82], ["0%", "100%"]);
  const copyY = useTransform(scrollYProgress, [.42, .7], [32, 0]);
  const copyOpacity = useTransform(scrollYProgress, [.42, .66], [0, 1]);
  const titleLines = locale === "fr"
    ? ["Une musique juste.", "Au bon moment.", "Pour la bonne image."]
    : ["The right music.", "At the right moment.", "For the right image."];

  const title = (className: string) => (
    <h2 className={className}>
      {titleLines.map((line) => <span key={line} className="block md:whitespace-nowrap">{line}</span>)}
    </h2>
  );

  return (
    <section id="manifesto" ref={sectionRef} className={reduceMotion ? "relative min-h-[100svh] overflow-clip bg-[var(--background)] md:min-h-screen" : "relative min-h-[225svh] overflow-clip bg-[var(--background)]"}>
      <div className={reduceMotion ? "relative flex min-h-[100svh] w-full items-center overflow-hidden py-10 md:min-h-screen md:py-16" : "sticky top-0 flex min-h-[100svh] w-full items-center overflow-hidden py-10 md:min-h-screen md:py-16"}>
        <div className="relative z-10 w-full px-3 md:px-8">
          <div className="mx-auto max-w-[1580px] text-left lg:text-center">
            <p className="eyebrow text-[var(--signal-strong)]">Parigo / {locale === "fr" ? "Manifeste" : "Manifesto"}</p>
            <div className="relative mt-8 md:mt-7">
              <>
                {title("select-none text-[clamp(4rem,17vw,5.8rem)] font-semibold uppercase leading-[.8] tracking-[-.075em] text-transparent lg:text-[clamp(2.25rem,6.3vw,7rem)] lg:leading-[.9] lg:tracking-[-.06em]")}
                <motion.div aria-hidden="true" style={reduceMotion ? { clipPath: "inset(0 0 0 0)" } : { clipPath: reveal }} className="absolute inset-0">
                  {title("text-[clamp(4rem,17vw,5.8rem)] font-semibold uppercase leading-[.8] tracking-[-.075em] text-[var(--foreground)] lg:text-[clamp(2.25rem,6.3vw,7rem)] lg:leading-[.9] lg:tracking-[-.06em]")}
                </motion.div>
                {!reduceMotion && <motion.span data-testid="manifesto-reveal-edge" aria-hidden="true" style={{ left: revealEdge }} className="pointer-events-none absolute -inset-y-8 w-[2px] -translate-x-1/2 bg-[var(--signal)] shadow-[0_0_12px_color-mix(in_srgb,var(--signal)_58%,transparent),0_0_52px_18px_color-mix(in_srgb,var(--signal)_15%,transparent)]" />}
              </>
            </div>
            <motion.div style={reduceMotion ? undefined : { y: copyY, opacity: copyOpacity }} className="mt-8 max-w-2xl border-t border-[var(--signal)] pt-5 lg:mx-auto lg:mt-10 lg:pt-6">
              <p className="text-sm leading-7 text-[var(--text-muted)] md:text-base">{locale === "fr" ? "Parigo accompagne chaque année plusieurs centaines d’heures de programmes audiovisuels, du cinéma à la publicité, avec une même exigence éditoriale." : "Every year, Parigo supports hundreds of hours of audiovisual programmes, from cinema to advertising, with the same editorial standards."}</p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
