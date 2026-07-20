"use client";

import { ContactForm } from "@/components/features/ContactForm";
import { InstitutionalShell } from "@/components/layout/InstitutionalShell";
import { useI18n } from "@/components/providers/I18nProvider";

export default function ContactPage() {
  const { locale, t } = useI18n();
  return <InstitutionalShell eyebrow={t("institutional.contactEyebrow")} title={t("institutional.contactTitle")} intro={t("institutional.contactIntro")}><section className="px-4 py-24 md:px-8 md:py-40"><div className="mx-auto grid max-w-[1500px] gap-16 md:grid-cols-12"><div className="md:col-span-4"><p className="eyebrow text-[var(--color-primary-dark)]">Parigo Music</p><address className="mt-6 not-italic text-lg leading-relaxed text-[var(--text-muted)]">Paris, France<br /><a href="mailto:contact@parigomusic.com" className="underline">contact@parigomusic.com</a></address><p className="mt-10 text-sm leading-relaxed opacity-45">{locale === "fr" ? "Les informations de contact restent à confirmer avec le client avant mise en production." : "Contact details remain to be confirmed with the client before production."}</p></div><div className="md:col-span-7 md:col-start-6"><ContactForm /></div></div></section></InstitutionalShell>;
}
