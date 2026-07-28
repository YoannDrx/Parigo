"use client";

import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useI18n } from "@/components/providers/I18nProvider";

export function ProjectInvitationSection() {
  const { locale, localizedPath } = useI18n();
  const reduceMotion = useReducedMotion();

  return (
    <section className="px-4 pb-20 md:px-8 md:pb-28">
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: 24 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: .2 }}
        transition={{ duration: .62, ease: [0.22, 1, 0.36, 1] }}
        className="project-invitation parigo-frame mx-auto grid max-w-[1580px] gap-10 border border-white/14 bg-[#0b0f0c] p-6 text-white md:grid-cols-12 md:items-end md:p-10 lg:p-12"
      >
        <div className="relative md:col-span-8">
          <h2 className="max-w-[15ch] text-[clamp(2.6rem,5vw,5.4rem)] leading-[.92] tracking-[-.055em] text-white">
            {locale === "fr" ? <>Envoyez-nous un brief.<br />Nous sélectionnons pour vous.</> : <>Send us a brief.<br />We’ll curate for you.</>}
          </h2>
        </div>
        <div className="relative md:col-span-3 md:col-start-10">
          <p className="leading-7 text-white/66">
            {locale === "fr"
              ? "Parlez-nous de votre projet, de votre deadline et de vos références, Nous construisons une sélection pour vous."
              : "Tell us about your project, your deadline and your references. We’ll build a selection for you."}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={localizedPath("/contact?subject=brief")} className="home-project-cta inline-flex min-h-11 items-center gap-2 rounded-md bg-[var(--signal)] px-5 text-sm font-semibold text-[#101410] transition hover:bg-white">
              {locale === "fr" ? "Envoyer un brief" : "Send a brief"}<ArrowRight size={15} />
            </Link>
            <a href="mailto:info@parigomusic.com" className="inline-flex min-h-11 items-center gap-2 border-b border-white/32 text-sm font-semibold text-white transition hover:border-[var(--signal)] hover:text-[var(--signal)]">
              {locale === "fr" ? "Contacter l’équipe" : "Contact the team"}<Mail size={15} />
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
