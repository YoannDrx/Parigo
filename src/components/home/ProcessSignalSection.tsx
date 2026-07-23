"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";

function ProcessStep({ number, title, copy, progress, index, stepLabel, reduceMotion }: { number: string; title: string; copy: string; progress: MotionValue<number>; index: number; stepLabel: string; reduceMotion: boolean }) {
  const start = .12 + index * .18;
  const opacity = useTransform(progress, [start, start + .2], [.2, 1]);
  const y = useTransform(progress, [start, start + .2], [38, 0]);

  return (
    <motion.article style={reduceMotion ? { opacity: 1, y: 0 } : { opacity, y }} className="process-step group relative flex min-h-[245px] flex-col px-5 py-7 transition-colors duration-500 hover:bg-white/[.055] lg:min-h-[360px] lg:px-8 lg:py-10">
      <div className="flex items-center justify-between gap-4">
        <span className="font-mono text-[.6rem] uppercase tracking-[.14em] text-[var(--signal)]">{stepLabel} {number}</span>
        <span aria-hidden="true" className="process-step__signal">
          <span className="process-step__signal-ink" />
          <span className="process-step__signal-green" />
        </span>
      </div>
      <span aria-hidden="true" className="process-step__number mt-5 w-fit border border-white/10 px-4 py-2 text-[4.1rem] font-semibold leading-none tracking-[-.09em] text-white/[.12] transition duration-500 group-hover:border-[var(--signal)]/34 group-hover:text-[var(--signal)] lg:mt-7 lg:text-[clamp(4.5rem,7vw,7.6rem)]">{number}</span>
      <div className="mt-auto pt-5 lg:pt-8"><h3 className="text-2xl font-semibold tracking-[-.045em] text-white lg:text-3xl">{title}</h3><p className="mt-3 max-w-sm text-sm leading-6 text-white/74 lg:mt-4">{copy}</p></div>
    </motion.article>
  );
}

export function ProcessSignalSection({ locale }: { locale: "fr" | "en" }) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start 84%", "end 45%"] });
  const steps = locale === "fr" ? [
    ["01", "Décrivez", "Une scène, une émotion, un rythme ou quelques références suffisent pour lancer la recherche."],
    ["02", "Écoutez & comparez", "Préécoutez, ouvrez les métadonnées, comparez les versions et construisez votre sélection de travail."],
    ["03", "Sélectionnez & licenciez", "Partagez une playlist, téléchargez les formats autorisés ou confiez-nous votre brief."],
  ] : [
    ["01", "Describe", "A scene, a feeling, a rhythm or a few references are enough to begin the search."],
    ["02", "Listen & compare", "Preview, open metadata, compare versions and build your working selection."],
    ["03", "Select & license", "Share a playlist, download authorised formats or send us your brief."],
  ];

  return (
    <section id="process" ref={sectionRef} className="px-4 py-16 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1580px]">
        <div className="mb-8 grid gap-5 md:mb-10 md:grid-cols-12 md:items-end md:gap-6"><div className="md:col-span-7"><p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Comment ça marche" : "How it works"}</p><h2 className="mt-4 text-[clamp(2.8rem,5vw,5.5rem)] leading-[.91] text-[var(--foreground)] md:mt-5">{locale === "fr" ? "Du brief à la sélection." : "From brief to selection."}</h2></div><p className="max-w-md text-sm leading-6 text-[var(--text-muted)] md:col-span-3 md:col-start-10">{locale === "fr" ? "Un parcours direct, pensé pour garder l’intuition créative au centre." : "A direct workflow designed to keep creative intuition at the centre."}</p></div>
        <div className="process-shell relative isolate overflow-hidden border border-white/14 bg-[#090c09] shadow-[0_34px_100px_rgba(5,10,6,.22)]">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_74%_22%,rgba(72,191,103,.18),transparent_30%),repeating-linear-gradient(115deg,transparent_0,transparent_88px,rgba(255,255,255,.035)_89px,transparent_90px)]" />
          <div className="relative border-b border-white/12 px-5 py-4 md:px-8 md:py-5">
            <div className="relative h-1 overflow-hidden rounded-full bg-white/8" data-testid="process-progress"><motion.div aria-hidden="true" style={reduceMotion ? { scaleX: 1 } : { scaleX: scrollYProgress, transformOrigin: "left" }} className="absolute inset-0 origin-left rounded-full bg-[var(--signal)] shadow-[0_0_18px_color-mix(in_srgb,var(--signal)_55%,transparent)]" /></div>
          </div>
          <div className="relative grid divide-y divide-white/12 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {steps.map(([number, title, copy], index) => <ProcessStep key={number} number={number} title={title} copy={copy} progress={scrollYProgress} index={index} stepLabel={locale === "fr" ? "Étape" : "Step"} reduceMotion={Boolean(reduceMotion)} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
