import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { localizedPath } from "@/lib/locale";

export function ComposerRelationshipSection({ locale }: { locale: "fr" | "en" }) {
  const paragraphs = locale === "fr"
    ? [
        "Une musique ne naît jamais seule. Elle est le fruit d'une rencontre, d'une sensibilité et d'un dialogue entre celles et ceux qui la composent et celles et ceux qui la font vivre.",
        "Chez Parigo, nous plaçons cette relation au cœur de notre métier.",
        "Nous développons notre catalogue original aux côtés d'autrices, d'auteurs, de compositrices, de compositeurs et d'artistes de talent, dont nous accompagnons les parcours avec passion, convaincus que les plus belles collaborations s'inscrivent dans la durée.",
      ]
    : [
        "Music is never born alone. It grows from an encounter, a sensibility and a dialogue between those who compose it and those who bring it to life.",
        "At Parigo, we place this relationship at the heart of our work.",
        "We develop our original catalogue alongside talented writers, composers and artists, supporting their journeys with passion and the conviction that the finest collaborations are built to last.",
      ];
  const cta = locale === "fr"
    ? "Découvrez les talents qui donnent une identité unique au catalogue original Parigo."
    : "Discover the talents who give Parigo's original catalogue its unique identity.";

  return (
    <section data-testid="home-composers" className="composer-relationship border-y border-[var(--line)] px-4 py-20 md:px-8 md:py-28">
      <div className="composer-relationship__panel parigo-frame mx-auto max-w-[1580px] overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)]">
        <div className="grid gap-10 px-6 py-10 md:grid-cols-12 md:px-10 md:py-14 lg:px-14 lg:py-18">
          <div className="md:col-span-7">
            <SignedTitle as="h2" className="max-w-[15ch] text-[clamp(3rem,6.2vw,7rem)] leading-[.88] tracking-[-.065em]">
              {locale === "fr" ? "Les talents qui donnent vie à notre catalogue." : "The talents who bring our catalogue to life."}
            </SignedTitle>
          </div>

          <div className="self-end space-y-5 border-t border-[var(--line-strong)] pt-6 text-base leading-7 text-[var(--foreground)] md:col-span-5 md:text-lg md:leading-8 lg:col-span-4 lg:col-start-9">
            {paragraphs.map((paragraph) => <p key={paragraph} className="text-[var(--text-muted)]">{paragraph}</p>)}
            <Link href={localizedPath(locale, "/compositeurs")} className="group inline-flex max-w-full items-end gap-2 border-b border-[var(--signal-strong)] py-1 font-semibold text-[var(--foreground)] transition hover:text-[var(--signal-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-strong)]">
              <span>{cta}</span><ArrowUpRight size={16} className="mb-1 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
