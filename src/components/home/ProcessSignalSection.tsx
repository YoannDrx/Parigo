"use client";

import { motion, useScroll } from "framer-motion";
import { useRef } from "react";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { HomeReveal, useHomeReducedMotion } from "./HomeMotion";

function ProcessStep({ number, title, copy, stepLabel }: { number: string; title: string; copy: string; stepLabel: string }) {
  return (
    <article className="process-step grid gap-4 border-t border-[var(--line-strong)] py-7 first:border-t-0 md:grid-cols-[4.5rem_minmax(0,.72fr)_minmax(16rem,1fr)] md:items-start md:gap-6 md:py-9">
      <span className="font-mono text-[.62rem] uppercase tracking-[.14em] text-[var(--signal-strong)]">{stepLabel} {number}</span>
      <h3 className="max-w-[14ch] text-2xl font-semibold tracking-[-.045em] text-[var(--foreground)] md:text-3xl">{title}</h3>
      <p className="max-w-xl text-sm leading-7 text-[var(--text-muted)]">{copy}</p>
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
      <div className="mx-auto grid max-w-[1580px] gap-12 lg:grid-cols-12 lg:gap-8">
        <HomeReveal origin="left" className="lg:col-span-4">
          <p className="mb-5 font-mono text-[.62rem] uppercase tracking-[.16em] text-[var(--signal-strong)]">{locale === "fr" ? "Notre méthode" : "Our method"}</p>
          <SignedTitle as="h2" className="max-w-[10ch] text-[clamp(2.8rem,5vw,5.5rem)] leading-[.91] text-[var(--foreground)]">{locale === "fr" ? "Du brief à la sélection." : "From brief to selection."}</SignedTitle>
          <p className="mt-7 max-w-sm text-sm leading-7 text-[var(--text-muted)]">{locale === "fr" ? "Un chemin simple, de l’intention musicale à une sélection prête à partager." : "A simple path from musical intent to a selection ready to share."}</p>
        </HomeReveal>
        <HomeReveal origin="right" delay={0.08} className="lg:col-span-7 lg:col-start-6">
          <div className="process-flow relative border-y border-[var(--line-strong)] pl-5 md:pl-7">
            <div aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-[var(--line)]" data-testid="process-progress"><motion.div style={reduceMotion ? { scaleY: 1 } : { scaleY: scrollYProgress, transformOrigin: "top" }} className="absolute inset-0 origin-top bg-[var(--signal-strong)]" /></div>
            <div className="relative">
              {steps.map(([number, title, copy]) => <ProcessStep key={number} number={number} title={title} copy={copy} stepLabel={locale === "fr" ? "Étape" : "Step"} />)}
            </div>
          </div>
        </HomeReveal>
      </div>
    </section>
  );
}
