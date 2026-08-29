"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { HomeReveal } from "./HomeMotion";

export function ProjectInvitationSection() {
  const { locale, localizedPath } = useI18n();

  return (
    <section className="px-[var(--space-page-gutter)] pb-[var(--space-section-y-large)]">
      <div className="project-invitation relative isolate mx-auto grid max-w-[1580px] gap-10 overflow-hidden rounded-[var(--parigo-turn-lg)_var(--parigo-corner-lg)] border border-white/14 bg-[#0b0f0c] p-6 text-white shadow-[0_28px_90px_rgba(5,10,6,.2)] md:grid-cols-12 md:items-end md:p-10 lg:p-12">
        <div className="relative md:col-span-8">
          <HomeReveal origin="left" viewportAmount={0.35}>
            <SignedTitle as="h2" className="max-w-[15ch] text-[clamp(2.6rem,5vw,5.4rem)] leading-[.92] tracking-[-.055em] text-white">
              {locale === "fr" ? <>Envoyez-nous un brief.<br />Nous sélectionnons pour vous</> : <>Send us a brief.<br />We’ll curate for you</>}
            </SignedTitle>
          </HomeReveal>
        </div>
        <HomeReveal origin="right" delay={0.12} viewportAmount={0.35} className="relative md:col-span-3 md:col-start-10">
            <p className="leading-7 text-white/66">
              {locale === "fr"
                ? "Parlez-nous de votre projet, de votre deadline et de vos références, Nous construisons une sélection pour vous."
                : "Tell us about your project, your deadline and your references. We’ll build a selection for you."}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={localizedPath("/contact?subject=brief")} className="home-project-cta inline-flex min-h-11 items-center gap-2 rounded-md bg-[var(--signal)] px-5 text-sm font-semibold text-[#101410] transition hover:bg-white">
                {locale === "fr" ? "Envoyer un brief" : "Send a brief"}<ArrowRight size={15} />
              </Link>
            </div>
        </HomeReveal>
      </div>
    </section>
  );
}
