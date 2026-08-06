"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { CSSProperties } from "react";
import { RevealText } from "@/components/motion/RevealText";
import { localizedPath } from "@/lib/locale";

const FEATURED_COMPOSERS = [
  { slug: "charlotte-savary", name: "Charlotte Savary", image: "/images/composers/canonical/charlotte_savary.webp", width: "clamp(10rem, 17vw, 15rem)", offset: "5.5rem", rotation: "-2.4deg", aspect: "aspect-[4/5]" },
  { slug: "arandel", name: "Arandel", image: "/images/composers/canonical/arandel.webp", width: "clamp(9.5rem, 15vw, 13.5rem)", offset: ".75rem", rotation: "1.6deg", aspect: "aspect-[3/4]" },
  { slug: "flore", name: "Flore", image: "/images/composers/canonical/flore.webp", width: "clamp(10rem, 16vw, 14.5rem)", offset: "7.5rem", rotation: "-1.2deg", aspect: "aspect-[4/5]" },
  { slug: "fabien-girard", name: "Fabien Girard", image: "/images/composers/canonical/fabien_girard.webp", width: "clamp(9rem, 14vw, 12.5rem)", offset: "2.5rem", rotation: "2.2deg", aspect: "aspect-square" },
  { slug: "laurent-dury", name: "Laurent Dury", image: "/images/composers/canonical/laurent_dury.webp", width: "clamp(10.5rem, 18vw, 15.5rem)", offset: "8.75rem", rotation: "-1.7deg", aspect: "aspect-[4/5]" },
  { slug: "madben", name: "Madben", image: "/images/composers/canonical/madben.webp", width: "clamp(9.5rem, 15vw, 13.5rem)", offset: "1.25rem", rotation: "1.1deg", aspect: "aspect-[3/4]" },
  { slug: "frederic-hanak", name: "Frédéric Hanak", image: "/images/composers/canonical/frederic_hanak.webp", width: "clamp(10rem, 16vw, 14rem)", offset: "6.25rem", rotation: "-2deg", aspect: "aspect-[4/5]" },
  { slug: "aiwa", name: "Aïwa", image: "/images/composers/canonical/aiwa.webp", width: "clamp(9rem, 14vw, 12.5rem)", offset: "0rem", rotation: "2.5deg", aspect: "aspect-square" },
  { slug: "jb-hanak", name: "JB Hanak", image: "/images/composers/canonical/jb_hanak.webp", width: "clamp(10rem, 17vw, 15rem)", offset: "7.75rem", rotation: "-1.3deg", aspect: "aspect-[3/4]" },
  { slug: "maxime-raynier", name: "Maxime Raynier", image: "/images/composers/canonical/maxime_raynier.webp", width: "clamp(9.5rem, 15vw, 13rem)", offset: "3.25rem", rotation: "1.8deg", aspect: "aspect-[4/5]" },
  { slug: "dj-troubl", name: "DJ Troubl", image: "/images/composers/canonical/dj_troubl.webp", width: "clamp(9rem, 14vw, 12.5rem)", offset: "9rem", rotation: "-2.6deg", aspect: "aspect-square" },
  { slug: "jean-pierre-menager", name: "Jean Pierre Ménager", image: "/images/composers/canonical/jean_pierre_menager.webp", width: "clamp(10rem, 16vw, 14.5rem)", offset: "1.75rem", rotation: "1.2deg", aspect: "aspect-[4/5]" },
  { slug: "ugly-mac-beer", name: "Ugly Mac Beer", image: "/images/composers/canonical/ugly_mac_beer.webp", width: "clamp(9.5rem, 15vw, 13.5rem)", offset: "6.75rem", rotation: "-1.6deg", aspect: "aspect-[3/4]" },
  { slug: "yann-kornowicz", name: "Yann Kornowicz", image: "/images/composers/canonical/yann_kornowicz.webp", width: "clamp(10rem, 17vw, 15rem)", offset: ".5rem", rotation: "2deg", aspect: "aspect-[4/5]" },
] as const;

function ComposerStreamGroup({ duplicate = false, locale }: { duplicate?: boolean; locale: "fr" | "en" }) {
  return (
    <ul
      className={`composer-cloud__group ${duplicate ? "composer-cloud__duplicate" : ""}`}
      aria-hidden={duplicate || undefined}
      aria-label={duplicate ? undefined : locale === "fr" ? "Compositeurs Parigo" : "Parigo composers"}
    >
      {FEATURED_COMPOSERS.map((composer) => (
        <li
          key={`${duplicate ? "duplicate" : "primary"}-${composer.slug}`}
          className="composer-cloud__item"
          style={{
            "--composer-width": composer.width,
            "--composer-offset": composer.offset,
            "--composer-rotation": composer.rotation,
          } as CSSProperties}
        >
          <Link
            href={localizedPath(locale, `/compositeurs/${composer.slug}`)}
            prefetch={false}
            tabIndex={duplicate ? -1 : undefined}
            className={`composer-cloud__card group relative block overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-strong)] ${composer.aspect}`}
          >
            <Image
              src={composer.image}
              alt=""
              fill
              sizes="(max-width: 767px) 46vw, 17vw"
              className="object-cover grayscale transition duration-700 group-hover:scale-[1.035] group-hover:grayscale-0 group-focus-visible:grayscale-0"
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/82 via-black/40 to-transparent px-4 pb-4 pt-16 text-left text-sm font-semibold text-white sm:text-base">
              {composer.name}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ComposerRelationshipSection({ locale }: { locale: "fr" | "en" }) {
  const description = locale === "fr"
    ? "Une musique ne naît jamais seule. Elle est le fruit d'une rencontre, d'une sensibilité et d'un dialogue entre celles et ceux qui la composent et celles et ceux qui la font vivre. Chez Parigo, nous plaçons cette relation au cœur de notre métier. Nous développons notre catalogue original aux côtés d'autrices, d'auteurs, de compositrices, de compositeurs et d'artistes de talent, dont nous accompagnons les parcours avec passion, convaincus que les plus belles collaborations s'inscrivent dans la durée."
    : "Music is never born alone. It grows from an encounter, a sensibility and a dialogue between those who compose it and those who bring it to life. At Parigo, we place this relationship at the heart of our work. We develop our original catalogue alongside talented writers, composers and artists, supporting their journeys with passion and the conviction that the finest collaborations are built to last.";
  const cta = locale === "fr"
    ? "Découvrez nos talents"
    : "Discover our talents";

  return (
    <section data-testid="home-composers" className="composer-relationship overflow-hidden border-b border-[var(--line)] px-4 py-24 md:px-8 md:py-36">
      <div className="mx-auto max-w-[1580px]">
        <header className="mx-auto max-w-[1180px] text-center">
          <RevealText
            as="h2"
            signature
            className="text-[clamp(3rem,6.5vw,7rem)] font-semibold leading-[.88] tracking-[-.065em]"
          >
            {locale === "fr" ? "Les talents qui donnent vie à notre catalogue." : "The talents who bring our catalogue to life."}
          </RevealText>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: .5 }}
            transition={{ duration: .7, delay: .18, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-8 max-w-5xl text-base leading-7 text-[var(--text-muted)] md:text-lg md:leading-8"
          >
            {description}
          </motion.p>
        </header>

        <div className="composer-cloud relative left-1/2 mt-14 w-screen -translate-x-1/2 md:mt-20">
          <motion.div
            initial={{ opacity: 0, y: 44 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: .15 }}
            transition={{ duration: .85, ease: [0.22, 1, 0.36, 1] }}
            className="composer-cloud__viewport"
          >
            <div className="composer-cloud__track">
              <ComposerStreamGroup locale={locale} />
              <ComposerStreamGroup locale={locale} duplicate />
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: .7 }}
          transition={{ duration: .65, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 flex justify-center text-center md:mt-6"
        >
          <Link href={localizedPath(locale, "/compositeurs")} className="group inline-flex max-w-4xl items-end justify-center gap-2 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:text-[var(--signal-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-strong)] md:text-base">
            <span className="underline decoration-2 decoration-[var(--signal-strong)] underline-offset-[7px]">{cta}</span>
            <ArrowUpRight size={17} className="mb-0.5 shrink-0 text-[var(--signal-strong)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
