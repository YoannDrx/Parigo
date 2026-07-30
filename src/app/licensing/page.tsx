"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { InstitutionalShell } from "@/components/layout/InstitutionalShell";
import { useI18n } from "@/components/providers/I18nProvider";
import { LicensingRates } from "@/components/institutional/LicensingRates";
import { SignedTitle } from "@/components/ui/SignedTitle";

export default function LicensingPage() {
  const { locale, t } = useI18n();
  return (
    <InstitutionalShell title={t("institutional.licensingTitle")} intro={t("institutional.licensingIntro")}>
      <section className="bg-[var(--surface-soft)] px-4 py-20 md:px-8 md:py-28"><div className="mx-auto max-w-[1700px]"><div className="mb-14 grid gap-8 md:grid-cols-12"><div className="md:col-span-8"><SignedTitle as="h2" className="font-[var(--font-editorial)] text-[clamp(3rem,7vw,8rem)] font-normal leading-[.86] tracking-[-.055em]">{locale === "fr" ? "Un cadre lisible, projet par projet." : "A clear framework, project by project."}</SignedTitle></div><p className="self-end text-sm leading-relaxed text-[var(--text-muted)] md:col-span-3 md:col-start-10">{locale === "fr" ? "Tarifs publics indicatifs, hors taxes, susceptibles d’évoluer. Le devis et l’autorisation de synchronisation font foi ; les droits SACEM/SDRM peuvent s’ajouter." : "Public indicative rates excluding VAT, subject to change. The quotation and synchronisation licence prevail; SACEM/SDRM royalties may apply separately."}</p></div><LicensingRates /><div className="parigo-frame mt-16 grid gap-10 border border-[var(--line-strong)] bg-[var(--signal)] p-7 text-[#11120f] md:mt-20 md:grid-cols-12 md:p-14"><div className="md:col-span-8"><p className="eyebrow">{locale === "fr" ? "Besoin d’un chiffrage" : "Need an estimate"}</p><SignedTitle as="h2" className="mt-5 font-[var(--font-editorial)] text-5xl font-normal leading-[.9] tracking-[-.05em] md:text-7xl">{locale === "fr" ? "Décrivez le projet, nous cadrons les droits." : "Describe the project. We will define the rights."}</SignedTitle></div><Link href="/contact" className="parigo-button inline-flex min-h-12 shrink-0 items-center justify-center gap-2 self-end bg-[#11120f] px-6 font-semibold !text-[#f3f0e8] transition hover:bg-white hover:!text-[#11120f] focus-visible:bg-white focus-visible:!text-[#11120f] md:col-span-3 md:col-start-10">{locale === "fr" ? "Demander une estimation" : "Request an estimate"} <ArrowRight size={17} /></Link></div></div></section>
    </InstitutionalShell>
  );
}
