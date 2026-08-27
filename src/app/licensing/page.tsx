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
      <section className="bg-[var(--surface-soft)] px-[var(--space-page-gutter)] pb-[var(--space-page-end)] pt-[var(--space-section-y)] md:pb-[var(--space-section-y)]"><div className="mx-auto max-w-[1700px]"><LicensingRates /><div className="parigo-frame mt-[var(--space-block-gap)] grid gap-8 border border-[var(--line-strong)] bg-[var(--signal)] p-7 text-[#11120f] md:grid-cols-12 md:gap-10 md:p-14"><div className="md:col-span-8"><SignedTitle as="h2" variant="section" className="font-[var(--font-editorial)] font-normal">{locale === "fr" ? "Décrivez le projet, nous cadrons les droits." : "Describe the project. We will define the rights."}</SignedTitle></div><Link href="/contact" className="parigo-button inline-flex min-h-12 shrink-0 items-center justify-center gap-2 self-end bg-[#11120f] px-6 font-semibold !text-[#f3f0e8] transition hover:bg-white hover:!text-[#11120f] focus-visible:bg-white focus-visible:!text-[#11120f] md:col-span-3 md:col-start-10">{locale === "fr" ? "Demander une estimation" : "Request an estimate"} <ArrowRight size={17} /></Link></div></div></section>
    </InstitutionalShell>
  );
}
