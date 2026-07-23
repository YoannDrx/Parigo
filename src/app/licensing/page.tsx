"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { InstitutionalShell } from "@/components/layout/InstitutionalShell";
import { useI18n } from "@/components/providers/I18nProvider";
import { LicensingRates } from "@/components/institutional/LicensingRates";

export default function LicensingPage() {
  const { locale, t } = useI18n();
  const steps = locale === "fr" ? [
    ["01", "Repérage", "Trouvez une piste ou partagez-nous votre brief."],
    ["02", "Vérification", "Nous validons droits, territoires, durée et supports."],
    ["03", "Autorisation", "Vous recevez une proposition adaptée au projet."],
    ["04", "Diffusion", "La musique est prête à vivre avec vos images."],
  ] : [
    ["01", "Discovery", "Find a track or share your brief with us."],
    ["02", "Clearance", "We confirm rights, territories, term and media."],
    ["03", "Approval", "You receive a proposal tailored to the project."],
    ["04", "Release", "The music is ready to live alongside your images."],
  ];
  return (
    <InstitutionalShell eyebrow={t("institutional.licensingEyebrow")} title={t("institutional.licensingTitle")} intro={t("institutional.licensingIntro")}>
      <section className="px-4 py-16 md:px-8 md:py-24"><div className="mx-auto max-w-[1700px]"><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{steps.map(([number, title, text]) => <article key={number} className="parigo-frame flex min-h-72 flex-col border border-[var(--line)] bg-[var(--surface)] p-7 md:p-9"><span className="font-mono text-[.65rem] text-[var(--signal-strong)]">{number}</span><h2 className="mt-auto font-[var(--font-editorial)] text-4xl font-normal tracking-[-.045em] md:text-5xl">{title}</h2><p className="mt-5 text-sm leading-relaxed text-[var(--text-muted)]">{text}</p></article>)}</div></div></section>
      <section className="bg-[var(--surface-soft)] px-4 py-20 md:px-8 md:py-28"><div className="mx-auto max-w-[1700px]"><div className="mb-14 grid gap-8 md:grid-cols-12"><div className="md:col-span-8"><p className="eyebrow text-[var(--color-primary-dark)]">{locale === "fr" ? "Grille indicative" : "Indicative rate card"}</p><h2 className="mt-5 font-[var(--font-editorial)] text-[clamp(3rem,7vw,8rem)] font-normal leading-[.86] tracking-[-.055em]">{locale === "fr" ? "Un cadre lisible, projet par projet." : "A clear framework, project by project."}</h2></div><p className="self-end text-sm leading-relaxed text-[var(--text-muted)] md:col-span-3 md:col-start-10">{locale === "fr" ? "Tarifs publics indicatifs, hors taxes, susceptibles d’évoluer. Le devis et l’autorisation de synchronisation font foi ; les droits SACEM/SDRM peuvent s’ajouter." : "Public indicative rates excluding VAT, subject to change. The quotation and synchronisation licence prevail; SACEM/SDRM royalties may apply separately."}</p></div><LicensingRates /><div className="parigo-frame mt-16 grid gap-10 border border-[var(--line-strong)] bg-[var(--signal)] p-7 text-[#11120f] md:mt-20 md:grid-cols-12 md:p-14"><div className="md:col-span-8"><p className="eyebrow">{locale === "fr" ? "Besoin d’un chiffrage" : "Need an estimate"}</p><h2 className="mt-5 font-[var(--font-editorial)] text-5xl font-normal leading-[.9] tracking-[-.05em] md:text-7xl">{locale === "fr" ? "Décrivez le projet, nous cadrons les droits." : "Describe the project. We will define the rights."}</h2></div><Link href="/contact" className="parigo-button inline-flex min-h-12 shrink-0 items-center justify-center gap-2 self-end bg-[#11120f] px-6 font-semibold text-[#f3f0e8] transition hover:bg-white hover:!text-[#11120f] md:col-span-3 md:col-start-10">{locale === "fr" ? "Demander une estimation" : "Request an estimate"} <ArrowRight size={17} /></Link></div></div></section>
    </InstitutionalShell>
  );
}
