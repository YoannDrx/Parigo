"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export function ManifestoScrollSection({ locale }: { locale: "fr" | "en" }) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const reveal = useTransform(scrollYProgress, [.2, .7], ["inset(0 100% 0 0)", "inset(0 0% 0 0)"]);
  const sweepX = useTransform(scrollYProgress, [.12, .78], ["-34vw", "112vw"]);
  const copyY = useTransform(scrollYProgress, [.28, .62], [32, 0]);
  const copyOpacity = useTransform(scrollYProgress, [.28, .54], [0, 1]);
  const titleLines = locale === "fr"
    ? ["Une musique juste.", "Au bon moment.", "Pour la bonne image."]
    : ["The right music.", "At the right moment.", "For the right image."];

  const title = (className: string) => (
    <h2 className={className}>
      {titleLines.map((line) => <span key={line} className="block whitespace-nowrap">{line}</span>)}
    </h2>
  );

  return (
    <section id="manifesto" ref={sectionRef} className="relative min-h-[135svh] overflow-clip bg-[var(--background)] md:min-h-[165svh]">
      <div className="sticky top-0 flex min-h-screen w-full items-center overflow-hidden py-16">
        <motion.div aria-hidden="true" style={reduceMotion ? { opacity: 0 } : { x: sweepX }} className="pointer-events-none absolute left-0 top-[7%] h-[86%] w-[28vw] -skew-x-[8deg] bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--signal)_36%,transparent),transparent)] blur-[1px]" />
        <div className="relative z-10 w-full px-4 md:px-8">
          <div className="grid gap-12 md:grid-cols-12 md:items-end">
            <div className="md:col-span-10">
              <p className="eyebrow text-[var(--signal-strong)]">Parigo / Manifesto</p>
              <div className="relative mt-7">
                {title("invisible text-[clamp(2rem,6.3vw,7rem)] font-semibold uppercase leading-[.9] tracking-[-.06em]")}
                <motion.div aria-hidden="true" style={reduceMotion ? { clipPath: "inset(0 0 0 0)" } : { clipPath: reveal }} className="absolute inset-0">
                  {title("text-[clamp(2rem,6.3vw,7rem)] font-semibold uppercase leading-[.9] tracking-[-.06em] text-[var(--foreground)]")}
                </motion.div>
              </div>
            </div>
            <motion.div style={reduceMotion ? undefined : { y: copyY, opacity: copyOpacity }} className="border-l border-[var(--signal)] pl-5 md:col-span-3 md:col-start-10 md:mt-6">
              <p className="text-sm leading-7 text-[var(--text-muted)] md:text-base">{locale === "fr" ? "Parigo accompagne chaque année plusieurs centaines d’heures de programmes audiovisuels, du cinéma à la publicité, avec une même exigence éditoriale." : "Every year, Parigo supports hundreds of hours of audiovisual programmes, from cinema to advertising, with the same editorial standards."}</p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
