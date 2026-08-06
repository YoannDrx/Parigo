"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { RevealText } from "@/components/motion/RevealText";
import { localizedPath } from "@/lib/locale";

const FEATURED_COMPOSERS = [
  {
    slug: "charlotte-savary",
    name: "Charlotte Savary",
    image: "/images/composers/canonical/charlotte_savary.webp",
    position: "md:translate-y-12 md:-rotate-[2deg]",
  },
  {
    slug: "arandel",
    name: "Arandel",
    image: "/images/composers/canonical/arandel.webp",
    position: "md:-translate-y-3 md:rotate-[1.5deg]",
  },
  {
    slug: "flore",
    name: "Flore",
    image: "/images/composers/canonical/flore.webp",
    position: "md:translate-y-8 md:-rotate-[1deg]",
  },
  {
    slug: "fabien-girard",
    name: "Fabien Girard",
    image: "/images/composers/canonical/fabien_girard.webp",
    position: "md:-translate-y-6 md:rotate-[2deg]",
  },
  {
    slug: "laurent-dury",
    name: "Laurent Dury",
    image: "/images/composers/canonical/laurent_dury.webp",
    position: "mx-auto w-[48%] md:mx-0 md:w-auto md:translate-y-10 md:-rotate-[1.5deg]",
  },
] as const;

export function ComposerRelationshipSection({ locale }: { locale: "fr" | "en" }) {
  const description = locale === "fr"
    ? "Une musique ne naît jamais seule. Elle est le fruit d'une rencontre, d'une sensibilité et d'un dialogue entre celles et ceux qui la composent et celles et ceux qui la font vivre. Chez Parigo, nous plaçons cette relation au cœur de notre métier. Nous développons notre catalogue original aux côtés d'autrices, d'auteurs, de compositrices, de compositeurs et d'artistes de talent, dont nous accompagnons les parcours avec passion, convaincus que les plus belles collaborations s'inscrivent dans la durée."
    : "Music is never born alone. It grows from an encounter, a sensibility and a dialogue between those who compose it and those who bring it to life. At Parigo, we place this relationship at the heart of our work. We develop our original catalogue alongside talented writers, composers and artists, supporting their journeys with passion and the conviction that the finest collaborations are built to last.";
  const cta = locale === "fr"
    ? "Découvrez les talents qui donnent une identité unique au catalogue original Parigo."
    : "Discover the talents who give Parigo's original catalogue its unique identity.";

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

        <div role="list" className="mt-16 grid grid-cols-2 items-start gap-3 pb-6 sm:gap-5 md:mt-24 md:grid-cols-5 md:gap-6 md:pb-16" aria-label={locale === "fr" ? "Portraits de compositeurs Parigo" : "Portraits of Parigo composers"}>
          {FEATURED_COMPOSERS.map((composer, index) => (
            <motion.div
              key={composer.slug}
              role="listitem"
              className={index === FEATURED_COMPOSERS.length - 1 ? "col-span-2 md:col-span-1" : undefined}
              initial={{ opacity: 0, y: 54 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: .25 }}
              transition={{ duration: .75, delay: index * .08, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                href={localizedPath(locale, `/compositeurs/${composer.slug}`)}
                className={`group relative block aspect-[4/5] overflow-hidden rounded-[var(--parigo-turn-lg)_var(--parigo-corner-lg)] border border-[var(--line-strong)] bg-[var(--surface)] shadow-[7px_8px_0_color-mix(in_srgb,var(--signal)_11%,transparent)] transition duration-500 hover:border-[var(--signal-strong)] hover:shadow-[11px_13px_0_color-mix(in_srgb,var(--signal)_16%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-strong)] ${composer.position}`}
              >
                <Image
                  src={composer.image}
                  alt=""
                  fill
                  sizes="(max-width: 767px) 50vw, 20vw"
                  className="object-cover grayscale transition duration-700 group-hover:scale-[1.035] group-hover:grayscale-0 group-focus-visible:grayscale-0"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/38 to-transparent px-4 pb-4 pt-14 text-left text-sm font-semibold text-white sm:text-base">
                  {composer.name}
                </span>
                <span aria-hidden="true" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/42 text-white backdrop-blur-sm transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:bg-[var(--signal-strong)] group-hover:text-[#0f1611]">
                  <ArrowUpRight size={15} />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: .7 }}
          transition={{ duration: .65, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 flex justify-center md:mt-16"
        >
          <Link href={localizedPath(locale, "/compositeurs")} className="group inline-flex min-h-14 max-w-4xl items-center justify-center gap-3 rounded-full border border-[var(--signal-strong)] bg-[var(--signal)] px-6 py-4 text-center text-sm font-semibold text-[#0f1611] transition duration-300 hover:-translate-y-1 hover:bg-[var(--signal-strong)] hover:shadow-[0_12px_32px_color-mix(in_srgb,var(--signal)_24%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-strong)] focus-visible:ring-offset-4 md:px-8 md:text-base">
            <span>{cta}</span>
            <ArrowUpRight size={17} className="shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
