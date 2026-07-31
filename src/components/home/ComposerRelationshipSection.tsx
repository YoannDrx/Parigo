import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { localizedPath } from "@/lib/locale";

const commitments = {
  fr: [
    ["Écouter", "Comprendre une écriture, ses nuances et la manière dont elle peut servir une image."],
    ["Accompagner", "Donner à chaque identité musicale le temps, le dialogue et le cadre nécessaires pour se développer."],
    ["Construire", "Faire durer les relations afin de réunir les bonnes sensibilités autour de chaque projet."],
  ],
  en: [
    ["Listen", "Understand a musical voice, its nuances and the way it can serve moving images."],
    ["Support", "Give every musical identity the time, dialogue and framework it needs to grow."],
    ["Build", "Nurture lasting relationships so the right sensibilities meet around every project."],
  ],
} as const;

export function ComposerRelationshipSection({ locale }: { locale: "fr" | "en" }) {
  return (
    <section data-testid="home-composers" className="composer-relationship border-y border-[var(--line)] px-4 py-20 md:px-8 md:py-28">
      <div className="composer-relationship__panel parigo-frame mx-auto max-w-[1580px] overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)]">
        <div className="grid gap-10 px-6 py-10 md:grid-cols-12 md:px-10 md:py-14 lg:px-14 lg:py-18">
          <div className="md:col-span-7">
            <SignedTitle as="h2" className="max-w-[11ch] text-[clamp(3rem,6.2vw,7rem)] leading-[.88] tracking-[-.065em]">
              {locale === "fr" ? "La musique commence par une rencontre." : "Music begins with an encounter."}
            </SignedTitle>
          </div>

          <div className="self-end border-t border-[var(--line-strong)] pt-6 text-[var(--foreground)] md:col-span-5 lg:col-span-4 lg:col-start-9">
            <p className="text-base leading-7 md:text-lg md:leading-8">
              {locale === "fr"
                ? "Depuis des années, Parigo construit son catalogue avec des compositeurs dont elle accompagne les écritures, les recherches et les évolutions. Chaque morceau naît d’un dialogue, d’une confiance et d’une compréhension concrète des images auxquelles il pourra donner du relief."
                : "For years, Parigo has built its catalogue alongside composers, supporting their writing, research and evolution. Every piece grows from dialogue, trust and a practical understanding of the images it can bring to life."}
            </p>
            <p className="mt-5 text-sm leading-7 text-[var(--text-muted)] md:text-base">
              {locale === "fr"
                ? "Nous privilégions les relations qui durent : connaître une sensibilité, laisser une identité musicale se développer et réunir les bonnes personnes autour de chaque projet. Parce qu’une musique juste commence toujours par une rencontre humaine."
                : "We favour relationships that last: learning a sensibility, allowing a musical identity to develop and bringing the right people together around each project. The right music always begins with a human encounter."}
            </p>
          </div>
        </div>

        <div className="composer-relationship__band grid gap-3 border-t border-[var(--line-strong)] p-4 md:grid-cols-3 md:p-6">
          {commitments[locale].map(([title, copy]) => (
            <article key={title} className="composer-relationship__commitment group relative min-h-52 p-6 md:p-8">
              <h3 className="mt-5 text-2xl font-semibold tracking-[-.04em] transition-transform duration-300 group-hover:translate-x-1">{title}</h3>
              <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--text-muted)]">{copy}</p>
            </article>
          ))}
        </div>

        <div className="flex justify-end border-t border-[var(--line)] px-6 py-4 md:px-8">
          <Link href={localizedPath(locale, "/compositeurs")} className="group inline-flex min-h-11 items-center gap-2 border-b border-[var(--signal-strong)] text-sm font-semibold text-[var(--foreground)] transition hover:text-[var(--signal-strong)]">
            {locale === "fr" ? "Découvrir nos compositeurs" : "Discover our composers"}<ArrowUpRight size={15} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
