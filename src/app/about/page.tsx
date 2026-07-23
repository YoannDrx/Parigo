"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { InstitutionalShell } from "@/components/layout/InstitutionalShell";
import { MediaReveal, RevealText } from "@/components/motion";
import { useI18n } from "@/components/providers/I18nProvider";

export default function AboutPage() {
  const { locale, t } = useI18n();
  const principles = locale === "fr" ? [
    ["01", "Éditer", "Construire des catalogues cohérents et défendre la singularité de chaque œuvre."],
    ["02", "Écouter", "Partir du récit, du montage et de la sensation avant de parler de genre."],
    ["03", "Accompagner", "Rendre la recherche, les droits et la diffusion lisibles du brief à l’antenne."],
  ] : [
    ["01", "Edit", "Build coherent catalogues and stand behind the singularity of every work."],
    ["02", "Listen", "Start with story, edit and feeling before speaking about genre."],
    ["03", "Support", "Make search, rights and release clear from the brief through broadcast."],
  ];
  return (
    <InstitutionalShell eyebrow={t("institutional.aboutEyebrow")} title={t("institutional.aboutTitle")} intro={t("institutional.aboutIntro")}>
      <section className="px-4 py-20 md:px-8 md:py-32">
        <div className="mx-auto grid max-w-[1700px] gap-16 md:grid-cols-12">
          <MediaReveal className="parigo-frame relative aspect-[4/3] overflow-hidden border border-[var(--line-strong)] md:col-span-7" direction="left"><Image src="/images/synchros/le-monde-de-demain2.jpg" alt="Le Monde de demain — Parigo" fill sizes="(max-width:768px) 100vw, 58vw" className="object-cover grayscale transition duration-1000 hover:grayscale-0" /></MediaReveal>
          <div className="self-center md:col-span-4 md:col-start-9"><p className="eyebrow text-[var(--color-primary-dark)]">{locale === "fr" ? "Écouter l’image" : "Listening to the image"}</p><RevealText as="h2" className="mt-6 font-[var(--font-editorial)] text-5xl font-normal leading-[.93] tracking-[-.05em] md:text-7xl">{locale === "fr" ? "Un catalogue devient utile lorsqu’il ouvre une conversation." : "A catalogue becomes useful when it starts a conversation."}</RevealText><p className="mt-8 leading-relaxed text-[var(--text-muted)]">{locale === "fr" ? "Notre approche associe profondeur éditoriale, outils de recherche et accompagnement humain. L’objectif n’est pas d’ajouter du choix, mais de faire émerger les pistes qui servent réellement une scène." : "Our approach combines editorial depth, search tools and human guidance. The aim is not to add more choice, but to surface the works that truly serve a scene."}</p><Link href="/contact" className="mt-9 inline-flex items-center gap-2 border-b border-[var(--line-strong)] pb-2 font-semibold hover:border-[var(--signal)]">{t("home.licenseCta")} <ArrowRight size={17} /></Link></div>
        </div>
      </section>
      <section className="theme-soft px-4 py-20 md:px-8 md:py-28"><div className="institutional-statement parigo-frame mx-auto grid max-w-[1700px] gap-12 border border-[var(--line-strong)] bg-[var(--surface)] p-6 md:grid-cols-12 md:p-10 lg:p-14"><p className="eyebrow text-[var(--color-primary-dark)] md:col-span-3">{locale === "fr" ? "Notre point de vue" : "Our point of view"}</p><RevealText as="p" className="font-[var(--font-editorial)] text-[clamp(2.8rem,6vw,7rem)] font-normal leading-[.9] tracking-[-.05em] md:col-span-8 md:col-start-5">{locale === "fr" ? "Éditer moins. Écouter mieux. Défendre chaque morceau comme une œuvre." : "Edit less. Listen better. Stand behind every track as a work in its own right."}</RevealText></div></section>
      <section className="px-4 py-20 md:px-8 md:py-28"><div className="mx-auto max-w-[1700px]"><div className="grid gap-10 md:grid-cols-12"><div className="md:col-span-4"><p className="eyebrow text-[var(--color-primary-dark)]">{locale === "fr" ? "Indépendante depuis Paris" : "Independent from Paris"}</p><h2 className="mt-6 font-[var(--font-editorial)] text-5xl font-normal leading-[.9] tracking-[-.05em] md:text-7xl">{locale === "fr" ? "Une maison pensée pour les professionnels de l’image." : "A music house built for image-makers."}</h2></div><div className="space-y-6 text-lg leading-relaxed text-[var(--text-muted)] md:col-span-6 md:col-start-7"><p>{locale === "fr" ? "Parigo est une librairie musicale indépendante qui accompagne réalisateurs, producteurs, agences, chaînes et music supervisors dans la recherche et la synchronisation d’œuvres." : "Parigo is an independent music library supporting directors, producers, agencies, broadcasters and music supervisors in finding and licensing works."}</p><p>{locale === "fr" ? "Membre permanent de la SACEM depuis 2013, membre de la SCPP et de l’Union des Librairies Musicales, Parigo relie une exigence éditoriale à une connaissance concrète des usages audiovisuels." : "A permanent SACEM member since 2013, and a member of SCPP and the Union des Librairies Musicales, Parigo combines editorial standards with practical audiovisual expertise."}</p></div></div><div className="mt-16 grid gap-4 md:mt-20 md:grid-cols-3">{principles.map(([number, title, text]) => <article key={number} className="parigo-frame flex min-h-72 flex-col border border-[var(--line)] bg-[var(--surface)] p-7"><span className="font-mono text-[.62rem] text-[var(--signal-strong)]">{number}</span><h3 className="mt-auto font-[var(--font-editorial)] text-5xl font-normal tracking-[-.04em]">{title}</h3><p className="mt-5 text-sm leading-relaxed text-[var(--text-muted)]">{text}</p></article>)}</div></div></section>
    </InstitutionalShell>
  );
}
