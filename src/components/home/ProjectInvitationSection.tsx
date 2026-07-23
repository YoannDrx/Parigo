"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useI18n } from "@/components/providers/I18nProvider";
import { Button } from "@/components/ui";

export function ProjectInvitationSection() {
  const { locale, t } = useI18n();
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
          <p className="eyebrow text-[var(--signal)]">{t("home.licenseEyebrow")}</p>
          <h2 className="mt-5 max-w-[14ch] text-[clamp(2.6rem,5vw,5.4rem)] leading-[.92] tracking-[-.055em] text-white">{t("home.licenseTitle")}</h2>
        </div>
        <div className="relative md:col-span-3 md:col-start-10">
          <p className="leading-7 text-white/66">{t("home.licenseCopy")}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/contact"><Button className="home-project-cta">{t("home.licenseCta")}</Button></Link>
            <Link href="/licensing" className="inline-flex min-h-11 items-center gap-2 border-b border-white/32 text-sm font-semibold text-white transition hover:border-[var(--signal)] hover:text-[var(--signal)]">
              {t("home.discoverLicensing")}<ArrowRight size={15} />
            </Link>
          </div>
          <p className="mt-7 font-mono text-[.56rem] uppercase tracking-[.13em] text-white/36">
            {locale === "fr" ? "Paris · Recherche humaine · Droits cadrés" : "Paris · Human search · Rights cleared"}
          </p>
        </div>
      </motion.div>
    </section>
  );
}
