"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LicensingRates } from "@/components/institutional/LicensingRates";
import { InstitutionalShell } from "@/components/layout/InstitutionalShell";
import { useI18n } from "@/components/providers/I18nProvider";
import { SignedTitle } from "@/components/ui/SignedTitle";

export default function LicensingPage() {
  const { locale, t, localizedPath } = useI18n();

  return (
    <InstitutionalShell
      title={t("institutional.licensingTitle")}
      intro={t("institutional.licensingIntro")}
      showHero={false}
    >
      <section className="bg-[var(--surface-soft)] px-[var(--space-page-gutter)] pb-[var(--space-page-end)] pt-[var(--space-page-top)]">
        <div className="mx-auto max-w-[1500px]">
          <div data-testid="licensing-split">
            <div
              data-testid="licensing-title-card"
              className="parigo-frame flex min-h-[26rem] flex-col justify-between border border-[var(--line-strong)] bg-[var(--surface)] p-6 sm:p-8 lg:min-h-[32rem] lg:p-12 xl:p-14"
            >
              <SignedTitle
                as="h1"
                className="max-w-[15ch] break-words font-[var(--font-editorial)] text-[clamp(2.5rem,9vw,6.8rem)] font-semibold leading-[.92] tracking-[-.055em]"
              >
                {t("institutional.licensingTitle")}
              </SignedTitle>
              <p className="mt-12 max-w-3xl text-sm leading-6 text-[var(--text-muted)] sm:text-base sm:leading-7 lg:text-lg lg:leading-8">
                {t("institutional.licensingIntro")}
              </p>
            </div>

          </div>

          <div className="mx-auto mt-[var(--space-section-y-large)] max-w-[1320px]">
            <LicensingRates />
          </div>

          <div className="parigo-frame mt-[var(--space-section-y-large)] grid gap-8 border border-[var(--line-strong)] bg-[var(--signal)] p-7 text-[#11120f] md:grid-cols-12 md:gap-10 md:p-14">
            <div className="md:col-span-8">
              <p className="eyebrow text-[#11120f]/65">{locale === "fr" ? "Votre projet est prêt ?" : "Is your project ready?"}</p>
              <SignedTitle as="h2" variant="section" className="mt-4 font-[var(--font-editorial)] font-normal">
                {locale === "fr" ? "Décrivez le projet, nous cadrons les droits." : "Describe the project. We will define the rights."}
              </SignedTitle>
            </div>
            <Link
              href={localizedPath("/contact")}
              className="parigo-button inline-flex min-h-12 shrink-0 items-center justify-center gap-2 self-end bg-[#11120f] px-6 font-semibold !text-[#f3f0e8] transition hover:bg-white hover:!text-[#11120f] focus-visible:bg-white focus-visible:!text-[#11120f] md:col-span-3 md:col-start-10"
            >
              {locale === "fr" ? "Demander une estimation" : "Request an estimate"} <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>
    </InstitutionalShell>
  );
}
