"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";

function ProcessStep({ number, title, copy, progress, index, stepLabel, reduceMotion }: { number: string; title: string; copy: string; progress: MotionValue<number>; index: number; stepLabel: string; reduceMotion: boolean }) {
  const start = .12 + index * .18;
  const opacity = useTransform(progress, [start, start + .2], [.2, 1]);
  const y = useTransform(progress, [start, start + .2], [38, 0]);

  return (
    <motion.article style={reduceMotion ? { opacity: 1, y: 0 } : { opacity, y }} className="group relative flex min-h-[300px] flex-col border-white/14 px-6 py-8 transition-colors duration-500 hover:bg-white/[.055] md:min-h-[360px] md:border-l md:px-8 md:py-10 first:md:border-l-0">
      <span aria-hidden="true" className="absolute left-6 top-0 h-px w-16 bg-[var(--signal)] transition-all duration-500 group-hover:w-[calc(100%-3rem)] md:left-8" />
      <span className="font-mono text-[.6rem] uppercase tracking-[.14em] text-[var(--signal)]">{stepLabel} {number}</span>
      <span aria-hidden="true" className="mt-7 text-[clamp(4.5rem,8vw,8.5rem)] font-semibold leading-none tracking-[-.09em] text-white/[.12] transition duration-500 group-hover:translate-x-2 group-hover:text-[var(--signal)]">{number}</span>
      <div className="mt-auto pt-8"><h3 className="text-2xl font-semibold tracking-[-.045em] text-white md:text-3xl">{title}</h3><p className="mt-4 max-w-sm text-sm leading-6 text-white/55">{copy}</p></div>
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
    <section id="process" ref={sectionRef} className="px-4 py-20 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1580px]">
        <div className="mb-10 grid gap-6 md:grid-cols-12 md:items-end"><div className="md:col-span-7"><p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Comment ça marche" : "How it works"}</p><h2 className="mt-5 text-[clamp(2.8rem,5vw,5.5rem)] leading-[.91]">{locale === "fr" ? "Du brief à la sélection." : "From brief to selection."}</h2></div><p className="max-w-md text-sm leading-6 text-[var(--text-muted)] md:col-span-3 md:col-start-10">{locale === "fr" ? "Un parcours direct, pensé pour garder l’intuition créative au centre." : "A direct workflow designed to keep creative intuition at the centre."}</p></div>
        <div className="relative isolate overflow-hidden rounded-[1.15rem] border border-white/14 bg-[#090c09] shadow-[0_34px_100px_rgba(5,10,6,.22)]">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_74%_22%,rgba(72,191,103,.18),transparent_30%),repeating-linear-gradient(115deg,transparent_0,transparent_88px,rgba(255,255,255,.035)_89px,transparent_90px)]" />
          <div className="relative grid border-b border-white/12 px-6 py-5 md:grid-cols-2 md:px-8"><p className="font-mono text-[.58rem] uppercase tracking-[.14em] text-white/42">Parigo music supervision system</p><p className="mt-2 font-mono text-[.58rem] uppercase tracking-[.14em] text-white/42 md:mt-0 md:text-right">Search · Listen · Select</p></div>
          <div className="relative grid md:grid-cols-3">
            <motion.div aria-hidden="true" style={reduceMotion ? { scaleX: 1 } : { scaleX: scrollYProgress, transformOrigin: "left" }} className="absolute inset-x-0 top-0 h-px bg-[var(--signal)]" />
            {steps.map(([number, title, copy], index) => <ProcessStep key={number} number={number} title={title} copy={copy} progress={scrollYProgress} index={index} stepLabel={locale === "fr" ? "Étape" : "Step"} reduceMotion={Boolean(reduceMotion)} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
