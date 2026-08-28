"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LicensingRates } from "@/components/institutional/LicensingRates";
import { InstitutionalShell } from "@/components/layout/InstitutionalShell";
import { useI18n } from "@/components/providers/I18nProvider";
import { SignedTitle } from "@/components/ui/SignedTitle";

const LICENSING_IMAGE = "/images/editorial/parigo-selected/r28-v1-licensing-detail-1920x1080.avif";

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
          <div data-testid="licensing-split" className="grid gap-5 lg:grid-cols-12 lg:items-stretch lg:gap-6">
            <div
              data-testid="licensing-title-card"
              className="parigo-frame flex h-full flex-col border border-[var(--line-strong)] bg-[var(--surface)] p-6 sm:p-8 lg:col-span-5 lg:p-8 xl:p-10"
            >
              <SignedTitle
                as="h1"
                className="max-w-[12ch] break-words font-[var(--font-editorial)] text-[clamp(2.5rem,9vw,5.7rem)] font-semibold leading-[.92] tracking-[-.055em] lg:text-[clamp(3.25rem,5.3vw,5.7rem)]"
              >
                {t("institutional.licensingTitle")}
              </SignedTitle>
              <p className="mt-6 max-w-2xl text-sm leading-6 text-[var(--text-muted)] sm:text-base sm:leading-7 lg:mt-auto lg:pt-6">
                {t("institutional.licensingIntro")}
              </p>
            </div>

            <figure
              data-testid="licensing-image-frame"
              className="parigo-frame relative aspect-video min-h-[240px] overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] lg:col-span-7 lg:h-full"
            >
              <Image
                src={LICENSING_IMAGE}
                alt={locale === "fr"
                  ? "Bureau en bois avec deux chaises, un téléphone à cadran, un Mac, un casque et un carnet"
                  : "Wooden desk with two chairs, a rotary phone, a Mac, headphones and a notebook"}
                fill
                preload
                sizes="(max-width: 1023px) 100vw, 58vw"
                data-testid="licensing-hero-image"
                className="object-cover"
              />
            </figure>
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
