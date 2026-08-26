"use client";

import { motion, useScroll } from "framer-motion";
import { useRef } from "react";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { HomeReveal, useHomeReducedMotion } from "./HomeMotion";

function ProcessStep({ number, title, copy, stepLabel }: { number: string; title: string; copy: string; stepLabel: string }) {
  return (
    <article className="process-step group relative flex min-h-[245px] flex-col px-5 py-7 transition-colors duration-500 hover:bg-white/[.055] lg:min-h-[360px] lg:px-8 lg:py-10">
      <div className="flex items-center justify-between gap-4">
        <span className="font-mono text-[.6rem] uppercase tracking-[.14em] text-[var(--signal)]">{stepLabel} {number}</span>
      </div>
      <span aria-hidden="true" className="process-step__number mt-5 w-fit border border-white/10 px-4 py-2 text-[4.1rem] font-semibold leading-none tracking-[-.09em] text-white/[.12] transition duration-500 group-hover:border-[var(--signal)]/34 group-hover:text-[var(--signal)] lg:mt-7 lg:text-[clamp(4.5rem,7vw,7.6rem)]">{number}</span>
      <div className="mt-auto pt-5 lg:pt-8"><h3 className="text-2xl font-semibold tracking-[-.045em] text-white lg:text-3xl">{title}</h3><p className="mt-3 max-w-sm text-sm leading-6 text-white/74 lg:mt-4">{copy}</p></div>
    </article>
  );
}

export function ProcessSignalSection({ locale }: { locale: "fr" | "en" }) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useHomeReducedMotion();
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
    <section id="process" ref={sectionRef} className="relative px-[var(--space-page-gutter)] py-[var(--space-section-y-large)]">
      <div className="mx-auto max-w-[1580px]">
        <HomeReveal origin="top" className="mb-[var(--space-heading-content)]"><SignedTitle as="h2" className="max-w-5xl text-[clamp(2.8rem,5vw,5.5rem)] leading-[.91] text-[var(--foreground)]">{locale === "fr" ? "Du brief à la sélection." : "From brief to selection."}</SignedTitle></HomeReveal>
        <div className="process-shell relative isolate overflow-hidden border border-white/14 bg-[#090c09] shadow-[0_34px_100px_rgba(5,10,6,.22)]">
          <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(145deg,rgba(72,191,103,.13),transparent_42%),linear-gradient(180deg,rgba(255,255,255,.025),transparent_70%)]" />
          <div className="relative border-b border-white/12 px-5 py-4 md:px-8 md:py-5">
            <div className="relative h-1 overflow-hidden rounded-full bg-white/8" data-testid="process-progress"><motion.div aria-hidden="true" style={reduceMotion ? { scaleX: 1 } : { scaleX: scrollYProgress, transformOrigin: "left" }} className="absolute inset-0 origin-left rounded-full bg-[var(--signal)] shadow-[0_0_18px_color-mix(in_srgb,var(--signal)_55%,transparent)]" /></div>
          </div>
          <div className="relative grid divide-y divide-white/12 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {steps.map(([number, title, copy]) => <ProcessStep key={number} number={number} title={title} copy={copy} stepLabel={locale === "fr" ? "Étape" : "Step"} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
