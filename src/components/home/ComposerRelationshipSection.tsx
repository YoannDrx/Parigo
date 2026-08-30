"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { localizedPath } from "@/lib/locale";
import { HomeReveal } from "./HomeMotion";
import { HomeSectionCta } from "./HomeSectionCta";

export type ComposerStreamProfile = {
  slug: string;
  name: string;
  image: string;
};

const CARD_PRESENTATIONS = [
  { width: "clamp(10rem, 17vw, 15rem)", offset: "5.5rem", rotation: "-2.4deg", aspect: "aspect-[4/5]" },
  { width: "clamp(9.5rem, 15vw, 13.5rem)", offset: ".75rem", rotation: "1.6deg", aspect: "aspect-[3/4]" },
  { width: "clamp(10rem, 16vw, 14.5rem)", offset: "7.5rem", rotation: "-1.2deg", aspect: "aspect-[4/5]" },
  { width: "clamp(9rem, 14vw, 12.5rem)", offset: "2.5rem", rotation: "2.2deg", aspect: "aspect-square" },
  { width: "clamp(10.5rem, 18vw, 15.5rem)", offset: "8.75rem", rotation: "-1.7deg", aspect: "aspect-[4/5]" },
  { width: "clamp(9.5rem, 15vw, 13.5rem)", offset: "1.25rem", rotation: "1.1deg", aspect: "aspect-[3/4]" },
  { width: "clamp(10rem, 16vw, 14rem)", offset: "6.25rem", rotation: "-2deg", aspect: "aspect-[4/5]" },
  { width: "clamp(9rem, 14vw, 12.5rem)", offset: "0rem", rotation: "2.5deg", aspect: "aspect-square" },
  { width: "clamp(10rem, 17vw, 15rem)", offset: "7.75rem", rotation: "-1.3deg", aspect: "aspect-[3/4]" },
  { width: "clamp(9.5rem, 15vw, 13rem)", offset: "3.25rem", rotation: "1.8deg", aspect: "aspect-[4/5]" },
  { width: "clamp(9rem, 14vw, 12.5rem)", offset: "9rem", rotation: "-2.6deg", aspect: "aspect-square" },
  { width: "clamp(10rem, 16vw, 14.5rem)", offset: "1.75rem", rotation: "1.2deg", aspect: "aspect-[4/5]" },
  { width: "clamp(9.5rem, 15vw, 13.5rem)", offset: "6.75rem", rotation: "-1.6deg", aspect: "aspect-[3/4]" },
  { width: "clamp(10rem, 17vw, 15rem)", offset: ".5rem", rotation: "2deg", aspect: "aspect-[4/5]" },
] as const;

function ComposerStreamGroup({ profiles, duplicate = false, locale }: { profiles: ComposerStreamProfile[]; duplicate?: boolean; locale: "fr" | "en" }) {
  return (
    <ul
      className={`composer-cloud__group ${duplicate ? "composer-cloud__duplicate" : ""}`}
      aria-hidden={duplicate || undefined}
      aria-label={duplicate ? undefined : locale === "fr" ? "Compositeurs Parigo" : "Parigo composers"}
    >
      {profiles.map((composer, index) => {
        const presentation = CARD_PRESENTATIONS[index % CARD_PRESENTATIONS.length];
        return (
          <li
            key={`${duplicate ? "duplicate" : "primary"}-${composer.slug}`}
            className="composer-cloud__item"
            style={{
              "--composer-width": presentation.width,
              "--composer-offset": presentation.offset,
              "--composer-rotation": presentation.rotation,
            } as CSSProperties}
          >
            <Link
              href={localizedPath(locale, `/talents/${composer.slug}`)}
              prefetch={false}
              tabIndex={duplicate ? -1 : undefined}
              className={`composer-cloud__card group relative block overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-strong)] ${presentation.aspect}`}
            >
              <Image
                src={composer.image}
                alt=""
                fill
                loading={!duplicate && index < 8 ? "eager" : "lazy"}
                sizes="(max-width: 767px) 46vw, 17vw"
                className="object-cover grayscale transition duration-700 group-hover:scale-[1.035] group-hover:grayscale-0 group-focus-visible:grayscale-0"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/82 via-black/40 to-transparent px-4 pb-4 pt-16 text-left text-sm font-semibold text-white sm:text-base">
                {composer.name}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function ComposerRelationshipSection({ profiles, locale }: { profiles: ComposerStreamProfile[]; locale: "fr" | "en" }) {
  const description = locale === "fr"
    ? "Une musique ne naît jamais seule. Elle est le fruit d'une rencontre, d'une sensibilité et d'un dialogue entre ceux qui la composent et ceux qui la font vivre. Chez Parigo, nous plaçons cette relation au cœur de notre métier. Nous développons notre catalogue original aux côtés d'auteurs, de compositeurs et d'artistes de talent, dont nous accompagnons les parcours avec passion, convaincus que les plus belles collaborations s'inscrivent dans la durée."
    : "Music is never born alone. It grows from an encounter, a sensibility and a dialogue between those who compose it and those who bring it to life. At Parigo, we place this relationship at the heart of our work. We develop our original catalogue alongside talented writers, composers and artists, supporting their journeys with passion and the conviction that the finest collaborations are built to last.";
  const cta = locale === "fr"
    ? "Découvrez nos talents"
    : "Discover our talents";

  return (
    <section data-testid="home-composers" className="composer-relationship overflow-hidden px-[var(--space-page-gutter)] py-[var(--space-section-y-large)]">
      <div className="mx-auto max-w-[1580px]">
        <header className="mx-auto max-w-[1180px] text-center">
          <HomeReveal origin="left" viewportAmount={0.28}>
            <SignedTitle as="h2" className="text-[clamp(3rem,6.5vw,7rem)] font-semibold leading-[.88] tracking-[-.065em]">
              {locale === "fr" ? "Les talents qui donnent vie à notre catalogue." : "The talents who bring our catalogue to life."}
            </SignedTitle>
          </HomeReveal>
          <p
            data-home-reveal="static"
            className="mx-auto mt-8 max-w-5xl text-base leading-7 text-[var(--text-muted)] md:text-lg md:leading-8"
          >
            {description}
          </p>
        </header>

        <div
          className="composer-cloud relative left-1/2 mt-[var(--space-heading-content)] w-screen -translate-x-1/2"
          style={{ "--composer-cloud-duration": `${Math.max(72, profiles.length * 5)}s` } as CSSProperties}
        >
          <div className="composer-cloud__viewport">
            <div className="composer-cloud__track">
              <ComposerStreamGroup profiles={profiles} locale={locale} />
              <ComposerStreamGroup profiles={profiles} locale={locale} duplicate />
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-center text-center">
          <HomeSectionCta href={localizedPath(locale, "/talents")}>{cta}</HomeSectionCta>
        </div>
      </div>
    </section>
  );
}
