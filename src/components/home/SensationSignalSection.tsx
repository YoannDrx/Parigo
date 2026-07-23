"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { intentToSearchParams, parseSearchIntent } from "@/lib/search-intent";

const CARD_LAYOUTS = [
  "lg:col-span-5 lg:min-h-[22rem]",
  "lg:col-span-4 lg:min-h-[22rem]",
  "lg:col-span-3 lg:min-h-[22rem]",
  "lg:col-span-4 lg:min-h-[18rem]",
  "lg:col-span-3 lg:min-h-[18rem]",
  "lg:col-span-5 lg:min-h-[18rem]",
] as const;

export function SensationSignalSection({ locale }: { locale: "fr" | "en" }) {
  const reduceMotion = useReducedMotion();
  const sensations = locale === "fr" ? [
    { label: "Publicité", query: "publicité solaire", note: "Impact immédiat" },
    { label: "Documentaire", query: "documentaire cinématique", note: "Récit & profondeur" },
    { label: "Fiction", query: "fiction sous tension", note: "Tension narrative" },
    { label: "Sport", query: "sport énergique", note: "Rythme & mouvement" },
    { label: "Mode", query: "mode électronique", note: "Allure contemporaine" },
    { label: "Émotion", query: "émotion", note: "Sensible & humain" },
  ] : [
    { label: "Advertising", query: "sunny advertising", note: "Immediate impact" },
    { label: "Documentary", query: "cinematic documentary", note: "Story & depth" },
    { label: "Fiction", query: "tense fiction", note: "Narrative tension" },
    { label: "Sport", query: "energetic sport", note: "Rhythm & movement" },
    { label: "Fashion", query: "electronic fashion", note: "Contemporary edge" },
    { label: "Emotion", query: "emotional", note: "Sensitive & human" },
  ];

  return (
    <section id="sensations" className="border-y border-[var(--line)] bg-[var(--surface-soft)] px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-[1580px]">
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 24 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: .2 }}
          transition={{ duration: .62, ease: [0.22, 1, 0.36, 1] }}
          className="grid gap-8 md:grid-cols-12 md:items-end"
        >
          <div className="md:col-span-7">
            <p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Chercher autrement" : "Search differently"}</p>
            <h2 className="mt-5 max-w-[10ch] text-[clamp(2.8rem,5vw,5.5rem)] leading-[.92] text-[var(--foreground)]">
              {locale === "fr" ? "Commencez par la sensation." : "Begin with a feeling."}
            </h2>
          </div>
          <div className="max-w-md self-end md:col-span-4 md:col-start-9">
            <p className="text-sm leading-7 text-[var(--text-muted)]">
              {locale === "fr"
                ? "Choisissez une direction sensible. Parigo la transforme en point de départ concret, puis vous laisse reprendre la main sur chaque critère."
                : "Choose a feeling. Parigo turns it into a concrete starting point, then lets you take control of every criterion."}
            </p>
            <Link href="/search" className="mt-5 inline-flex min-h-10 items-center gap-2 font-mono text-[.62rem] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)] transition hover:text-[var(--signal-strong)]">
              {locale === "fr" ? "Décrire votre propre intention" : "Describe your own intention"}
              <ArrowRight size={14} className="text-[var(--signal-strong)]" />
            </Link>
          </div>
        </motion.div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
          {sensations.map((item, index) => (
            <motion.div
              key={item.label}
              initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: .15 }}
              transition={{ duration: .5, delay: index * .045, ease: [0.22, 1, 0.36, 1] }}
              className={CARD_LAYOUTS[index]}
            >
              <Link
                href={`/search?${intentToSearchParams(parseSearchIntent(item.query)).toString()}`}
                aria-label={`${item.label} — ${locale === "fr" ? "chercher dans le catalogue" : "search the catalogue"}`}
                className="sensation-card parigo-frame group flex h-full min-h-56 flex-col justify-between border border-[var(--line-strong)] bg-[var(--surface)] p-6 text-[var(--foreground)] md:p-8"
              >
                <div className="relative flex items-start justify-between gap-5">
                  <span className="sensation-card__note font-mono text-[.58rem] uppercase tracking-[.14em] text-[var(--text-muted)] transition">{item.note}</span>
                  <span className="sensation-card__index flex items-center gap-2 font-mono text-[.58rem] text-[var(--signal-strong)] transition">
                    0{index + 1}<ArrowUpRight size={15} />
                  </span>
                </div>
                <div className="relative mt-16">
                  <p className="sensation-card__cta mb-4 font-mono text-[.55rem] uppercase tracking-[.13em] text-[var(--signal-strong)] transition">
                    {locale === "fr" ? "Lancer cette direction" : "Start this direction"}
                  </p>
                  <h3 className="sensation-card__title max-w-full break-words text-[clamp(2rem,3.3vw,4.2rem)] leading-[.88] tracking-[-.06em] transition-colors">{item.label}</h3>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
