"use client";

import Image from "next/image";
import { useI18n } from "@/components/providers/I18nProvider";
import { SignedTitle } from "@/components/ui/SignedTitle";

const TRUSTED_CLIENTS = [
  { name: "Disney+", src: "/images/partners/disney-plus-clean.png", width: 1149, height: 660, logoClass: "max-h-[5.5rem] max-w-[82%]" },
  { name: "Canal+", src: "/images/partners/canal-plus-clean.png", width: 1021, height: 249, logoClass: "max-h-[4.2rem] max-w-[78%]" },
  { name: "Netflix", src: "/images/partners/netflix-complete.png", width: 1180, height: 413, logoClass: "max-h-[4.6rem] max-w-[72%]" },
  { name: "HBO", src: "/images/partners/hbo-complete.png", width: 892, height: 425, logoClass: "max-h-[4.8rem] max-w-[62%]" },
  { name: "BBC", src: "/images/partners/bbc-clean.png", width: 1149, height: 388, logoClass: "max-h-[4.5rem] max-w-[72%]" },
  { name: "arte.tv", src: "/images/partners/arte-tv-clean.png", width: 1079, height: 253, logoClass: "max-h-[4.2rem] max-w-[76%]" },
  { name: "Call of Duty", src: "/images/partners/call-of-duty-complete.png", width: 1180, height: 317, logoClass: "max-h-[4.1rem] max-w-[76%]" },
  { name: "france.tv", src: "/images/partners/france-tv-complete.png", width: 1052, height: 304, logoClass: "max-h-[3.9rem] max-w-[72%]" },
  { name: "Paramount+", src: "/images/partners/paramount-plus-clean.png", width: 1145, height: 327, logoClass: "max-h-[4.4rem] max-w-[78%]" },
  { name: "MTV", src: "/images/partners/mtv-monochrome.png", width: 1030, height: 647, logoClass: "max-h-[5.8rem] max-w-[64%]" },
  { name: "Y", src: "/images/partners/y-clean.png", width: 530, height: 592, logoClass: "max-h-[6.4rem] max-w-[46%]" },
  { name: "Viasanté Mutuelle", src: "/images/partners/viasante-mutuelle-clean.png", width: 595, height: 614, logoClass: "max-h-[6.5rem] max-w-[54%]" },
] as const;

function ClientLogoList({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <ul
      className={`partner-marquee__group ${duplicate ? "partner-marquee__duplicate" : ""}`}
      aria-hidden={duplicate || undefined}
    >
      {TRUSTED_CLIENTS.map((client) => (
        <li key={`${duplicate ? "duplicate" : "primary"}-${client.name}`} className="partner-marquee__item">
          <div className="partner-logo-card">
            <Image
              src={client.src}
              alt={duplicate ? "" : client.name}
              width={client.width}
              height={client.height}
              sizes="(max-width: 767px) 12rem, 15rem"
              className={`partner-client-logo h-auto w-auto object-contain ${client.logoClass}`}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PartnerMarquee() {
  const { locale } = useI18n();

  return (
    <section data-testid="home-partners-section" className="partner-section relative overflow-hidden border-y border-white/12 bg-[#0b110d] py-16 text-white md:py-24">
      <div className="partner-section__glow" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1580px] px-4 md:px-8">
        <div className="grid gap-7 md:grid-cols-12 md:items-end">
          <SignedTitle as="h2" className="max-w-[11ch] text-[clamp(2.8rem,5.5vw,6.2rem)] leading-[.9] tracking-[-.06em] text-white md:col-span-8">
            {locale === "fr" ? "Ils nous ont fait confiance." : "They trust us."}
          </SignedTitle>
          <p className="max-w-sm border-t border-white/22 pt-4 text-sm leading-6 text-white/62 md:col-span-3 md:col-start-10">
            {locale === "fr"
              ? "Du streaming au cinéma, du jeu vidéo à la télévision : notre musique accompagne leurs images."
              : "From streaming and cinema to gaming and television, our music brings their images to life."}
          </p>
        </div>
      </div>
      <div className="partner-marquee relative mt-10 border-y border-white/12 py-3 md:mt-14 md:py-4" aria-label={locale === "fr" ? "Clients Parigo" : "Parigo clients"}>
        <div className="partner-marquee__track">
          <ClientLogoList />
          <ClientLogoList duplicate />
        </div>
      </div>
    </section>
  );
}
