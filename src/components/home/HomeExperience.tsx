"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, ArrowRight } from "lucide-react";
import { Header, Footer } from "@/components/layout";
import { AISearch, ContactForm, MiniPlayer } from "@/components/features";
import { RevealText, TypewriterText } from "@/components/motion";
import { Button } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import { SignalFieldLoader } from "./SignalFieldLoader";
import { ArtistSignalSection } from "./ArtistSignalSection";
import { AssistedSearchDemo } from "./AssistedSearchDemo";
import { SyncShowcase } from "./SyncShowcase";
import { DesireGallery } from "./DesireGallery";
import { ReleasesSplitSequence } from "./ReleasesSplitSequence";

function HeroComposition() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const mainY = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const sideY = useTransform(scrollYProgress, [0, 1], [0, -110]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-2.5, 2]);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 opacity-20"><SignalFieldLoader /></div>
      <motion.div style={{ y: mainY, rotate }} className="absolute left-[17%] top-[16%] h-[54%] w-[68%] overflow-hidden border border-white/12 bg-black shadow-[0_36px_130px_rgba(0,0,0,.55)] md:left-[25%] md:top-[10%] md:h-[69%] md:w-[53%]">
        <Image src="/images/synchros/le-monde-de-demain2.jpg" alt="" fill priority sizes="(max-width: 768px) 80vw, 55vw" className="object-cover grayscale contrast-125" />
        <div className="absolute inset-0 bg-black/25" />
      </motion.div>
      <motion.div style={{ y: sideY }} className="absolute -left-[4%] bottom-[15%] hidden aspect-[4/3] w-[24%] rotate-[5deg] overflow-hidden border border-white/15 shadow-2xl md:block">
        <Image src="/images/synchros/tokyo-vice.jpg" alt="" fill sizes="25vw" className="object-cover grayscale" />
      </motion.div>
      <motion.div style={{ y: sideY }} className="absolute -right-[2%] top-[23%] hidden aspect-[3/4] w-[20%] rotate-[-5deg] overflow-hidden border border-white/15 shadow-2xl md:block">
        <Image src="/images/synchros/monkey-man.jpg" alt="" fill sizes="22vw" className="object-cover grayscale" />
      </motion.div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_10%,rgba(8,9,7,.48)_78%)]" />
    </div>
  );
}

export function HomeExperience() {
  const { locale, t } = useI18n();
  const uses = locale === "fr" ? [
    ["Publicité", "Une pop solaire, moderne et immédiate"], ["Documentaire", "Un piano intime, organique et sans voix"], ["Fiction", "Une tension cinématique sombre et progressive"], ["Sport", "Un beat énergique à plus de 125 BPM"], ["Émotion", "Des cordes sensibles, lentes et mélancoliques"], ["Lifestyle", "Une électronique douce, élégante et positive"],
  ] : [
    ["Advertising", "Bright, contemporary pop with an immediate hook"], ["Documentary", "Intimate, organic piano with no vocals"], ["Fiction", "Dark, progressive cinematic tension"], ["Sport", "An energetic beat above 125 BPM"], ["Emotion", "Sensitive, slow and melancholic strings"], ["Lifestyle", "Soft, elegant and positive electronica"],
  ];

  return (
    <div className="page-shell">
      <Header variant="overlay" />
      <main>
        <section className="grain relative min-h-[100svh] overflow-hidden bg-[#0d0e0c] text-[#f3f0e8]">
          <HeroComposition />
          <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-[1900px] flex-col px-4 pb-7 pt-28 md:px-8 md:pb-9 md:pt-32">
            <div className="relative flex flex-1 flex-col justify-between">
              <div className="grid items-start gap-8 md:grid-cols-12">
                <p className="eyebrow text-[var(--signal)] md:col-span-3">{t("home.eyebrow")}</p>
                <p className="max-w-sm text-sm leading-relaxed opacity-58 md:col-span-3 md:col-start-10">{t("home.promise")}</p>
              </div>
              <h1 aria-label={`${t("home.titleTop")} ${t("home.titleBottom")}`} className="relative z-10 my-12 font-[var(--font-editorial)] text-[clamp(5rem,15vw,17rem)] font-normal leading-[.65] tracking-[-.075em] md:my-6">
                <motion.span initial={{ y: 70, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .9, ease: [0.22, 1, 0.36, 1] }} className="block">{t("home.titleTop")}</motion.span>
                <motion.span initial={{ y: 70, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .9, delay: .08, ease: [0.22, 1, 0.36, 1] }} className="block text-right italic text-[var(--signal)]">{t("home.titleBottom")}</motion.span>
              </h1>
              <div className="grid items-end gap-8 md:grid-cols-12">
                <div className="md:col-span-8"><AISearch showExamples /></div>
                <div className="hidden justify-end md:col-span-4 md:flex"><a href="#statement" className="flex h-16 w-16 items-center justify-center rounded-full border border-white/22 transition hover:border-[var(--signal)] hover:text-[var(--signal)]" aria-label={t("home.scroll")}><ArrowDown /></a></div>
              </div>
            </div>
          </div>
        </section>

        <section id="statement" className="px-4 py-28 md:px-8 md:py-48">
          <div className="mx-auto max-w-[1800px]">
            <TypewriterText className="eyebrow mb-12 text-[var(--color-primary-dark)]">{t("home.statementEyebrow")}</TypewriterText>
            <RevealText as="h2" className="section-title-serif max-w-[1600px]">{t("home.statement")}</RevealText>
            <DesireGallery />
          </div>
        </section>

        <motion.section initial={{ clipPath: "inset(7% 2% 0% 2%)", scale: .98 }} whileInView={{ clipPath: "inset(0% 0% 0% 0%)", scale: 1 }} viewport={{ once: true, amount: .08 }} transition={{ duration: .8, ease: [0.22, 1, 0.36, 1] }} className="theme-negative px-4 py-28 md:px-8 md:py-44">
          <div className="mx-auto grid max-w-[1700px] gap-16 md:grid-cols-12">
            <div className="md:col-span-5"><p className="eyebrow mb-6 text-[var(--signal)]">{t("home.searchDisclosure")}</p><RevealText as="h2" mode="lines" className="section-title-serif">{t("home.demoTitle")}</RevealText><p className="mt-8 max-w-md text-lg leading-relaxed opacity-55">{t("home.demoCopy")}</p></div>
            <div className="self-center md:col-span-7 md:col-start-6"><AssistedSearchDemo /></div>
          </div>
        </motion.section>

        <section className="overflow-hidden px-4 py-28 md:px-8 md:py-44">
          <div className="mx-auto max-w-[1800px]"><div className="mb-20 grid gap-10 md:grid-cols-12"><div className="md:col-span-8"><p className="eyebrow mb-6 text-[var(--color-primary-dark)]">{t("home.releasesEyebrow")}</p><RevealText as="h2" className="section-title-serif">{t("home.releasesTitle")}</RevealText></div><Link href="/albums" className="self-end justify-self-start border-b border-current/25 pb-2 text-sm md:col-span-3 md:col-start-10">{t("common.albums")} <ArrowRight className="ml-2 inline" size={15} /></Link></div>
            <ReleasesSplitSequence />
          </div>
        </section>

        <ArtistSignalSection />

        <SyncShowcase />

        <section className="px-4 py-28 md:px-8 md:py-44"><div className="mx-auto max-w-[1800px]"><div className="mb-20 grid gap-8 md:grid-cols-12"><div className="md:col-span-8"><p className="eyebrow mb-6 text-[var(--color-primary-dark)]">{t("home.usesEyebrow")}</p><RevealText as="h2" className="section-title-serif">{t("home.usesTitle")}</RevealText></div></div><div className="border-t border-[var(--line)]">{uses.map(([name, prompt], index) => <Link key={name} href={`/search?q=${encodeURIComponent(prompt)}`} className="group grid min-h-32 items-center border-b border-[var(--line)] py-6 transition md:grid-cols-12 md:py-8"><span className="font-mono text-[.62rem] opacity-35 md:col-span-1">0{index + 1}</span><h3 className="font-[var(--font-editorial)] text-5xl font-normal tracking-[-.045em] transition duration-500 group-hover:translate-x-4 group-hover:italic group-hover:text-[var(--color-primary-dark)] md:col-span-5 md:text-7xl">{name}</h3><p className="mt-4 max-w-md text-sm text-[var(--text-muted)] md:col-span-4 md:col-start-8 md:mt-0">{prompt}</p><ArrowRight className="hidden transition group-hover:translate-x-2 md:block" /></Link>)}</div></div></section>

        <motion.section initial={{ clipPath: "inset(0 0 100% 0)" }} whileInView={{ clipPath: "inset(0 0 0% 0)" }} viewport={{ once: true, amount: .1 }} transition={{ duration: .85, ease: [0.22, 1, 0.36, 1] }} className="grain bg-[var(--signal)] px-4 py-28 text-[#11120f] md:px-8 md:py-44"><div className="mx-auto grid max-w-[1800px] gap-14 md:grid-cols-12"><div className="md:col-span-9"><TypewriterText className="eyebrow mb-6">{t("home.licenseEyebrow")}</TypewriterText><RevealText as="h2" className="section-title-serif">{t("home.licenseTitle")}</RevealText></div><div className="self-end md:col-span-3"><p className="mb-8 text-lg leading-relaxed opacity-65">{t("home.licenseCopy")}</p><div className="flex flex-wrap gap-3"><Link href="/contact"><Button variant="secondary">{t("home.licenseCta")}</Button></Link><Link href="/licensing"><Button variant="outline">{t("home.discoverLicensing")}</Button></Link></div></div></div></motion.section>

        <section className="px-4 py-28 md:px-8 md:py-44">
          <div className="mx-auto grid max-w-[1800px] gap-16 md:grid-cols-12">
            <div className="md:sticky md:top-28 md:col-span-5 md:self-start">
              <TypewriterText className="eyebrow text-[var(--color-primary-dark)]">{t("institutional.contactEyebrow")}</TypewriterText>
              <RevealText as="h2" mode="lines" className="section-title-serif mt-7">{t("institutional.contactTitle")}</RevealText>
              <p className="mt-7 max-w-md text-lg leading-relaxed text-[var(--text-muted)]">{t("institutional.contactIntro")}</p>
            </div>
            <div className="md:col-span-6 md:col-start-7"><ContactForm /></div>
          </div>
        </section>
      </main>
      <Footer />
      <MiniPlayer />
    </div>
  );
}
