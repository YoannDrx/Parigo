"use client";

import Link from "next/link";
import { LabelLogo } from "@/components/catalog/LabelLogo";
import { useI18n } from "@/components/providers/I18nProvider";
import { SignedTitle } from "@/components/ui/SignedTitle";

export interface HomePartner {
  id: string;
  slug: string;
  name: string;
  logo: string;
}

function PartnerList({ partners, duplicate = false }: { partners: HomePartner[]; duplicate?: boolean }) {
  const { localizedPath } = useI18n();
  return (
    <ul className={`partner-marquee__group flex shrink-0 items-center ${duplicate ? "partner-marquee__duplicate" : ""}`} aria-hidden={duplicate || undefined}>
      {partners.map((partner) => (
        <li key={`${duplicate ? "duplicate" : "primary"}-${partner.id}`} className="partner-marquee__item flex shrink-0 items-center justify-center border-r border-white/12 px-3 md:px-4">
          <Link href={localizedPath(`/labels/${partner.slug}`)} tabIndex={duplicate ? -1 : undefined} className="partner-logo-card group relative flex h-28 w-44 items-center justify-center px-6 py-5 md:h-32 md:w-56" aria-label={duplicate ? undefined : partner.name}>
            <LabelLogo src={partner.logo} alt={duplicate ? "" : partner.name} width={208} height={82} sizes="208px" fallbackSize={52} className="relative z-[1] max-h-16 w-auto max-w-full object-contain grayscale opacity-65 transition duration-500 group-hover:scale-[1.04] group-hover:grayscale-0 group-hover:opacity-100 group-focus-visible:grayscale-0 group-focus-visible:opacity-100" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function PartnerMarquee({ partners }: { partners: HomePartner[] }) {
  const { locale } = useI18n();
  if (!partners.length) return null;

  return (
    <section data-testid="home-partners-section" className="partner-section overflow-hidden border-y border-white/12 bg-[#0b110d] py-16 text-white md:py-24">
      <div className="mx-auto grid max-w-[1580px] gap-6 px-4 md:grid-cols-12 md:items-end md:px-8">
        <SignedTitle as="h2" className="max-w-[11ch] text-[clamp(2.8rem,5.5vw,6.2rem)] leading-[.9] tracking-[-.06em] text-white md:col-span-8">
          {locale === "fr" ? "Ils nous ont fait confiance." : "They trust us."}
        </SignedTitle>
        <p className="max-w-sm border-t border-white/22 pt-4 text-sm leading-6 text-white/62 md:col-span-3 md:col-start-10">
          {locale === "fr" ? "Des partenaires éditoriaux avec lesquels nous partageons une même exigence pour la musique et les images." : "Editorial partners who share our commitment to music and moving images."}
        </p>
      </div>
      <div className="partner-marquee mt-10 overflow-hidden border-y border-white/12 py-4 md:mt-14" aria-label={locale === "fr" ? "Labels partenaires" : "Partner labels"}>
        <div className="partner-marquee__track flex w-max">
          <PartnerList partners={partners} />
          <PartnerList partners={partners} duplicate />
        </div>
      </div>
    </section>
  );
}
