"use client";

import Image from "next/image";
import { InstitutionalShell } from "@/components/layout/InstitutionalShell";
import { useI18n } from "@/components/providers/I18nProvider";
import { SignedTitle } from "@/components/ui/SignedTitle";

export default function AboutPage() {
  const { locale, t } = useI18n();
  const paragraphs = locale === "fr"
    ? [
        "Fondée en 2004, Parigo est une librairie musicale indépendante qui accompagne les professionnels de l'image et du son dans la recherche de la musique idéale pour leurs projets. Depuis nos débuts, nous avons fait le choix de placer l'humain au cœur de notre métier, convaincus qu'aucun algorithme ne remplacera jamais la sensibilité d'un véritable échange.",
        "Chaque projet est unique. C'est pourquoi nous prenons le temps d'écouter vos besoins, de comprendre votre intention et de vous guider vers les œuvres les plus adaptées, en associant expertise musicale, réactivité et accompagnement personnalisé.",
        "Cette même exigence guide également notre travail de production. En collaborant avec des compositeurs, artistes et producteurs de talent venus de France et d'ailleurs, nous développons un catalogue original qui vient enrichir notre offre internationale. Pour nous, la musique est avant tout une histoire de création, de rencontres et de confiance.",
      ]
    : [
        "Founded in 2004, Parigo is an independent music library that helps image and sound professionals find the ideal music for their projects. From the outset, we have chosen to put people at the heart of our work, convinced that no algorithm can ever replace the sensitivity of a genuine conversation.",
        "Every project is unique. That is why we take the time to listen to your needs, understand your intention and guide you towards the most suitable works, combining musical expertise, responsiveness and personal support.",
        "The same standards guide our production work. By collaborating with talented composers, artists and producers from France and beyond, we develop an original catalogue that enriches our international offering. For us, music is first and foremost a story of creation, encounters and trust.",
      ];

  return (
    <InstitutionalShell title={t("institutional.aboutTitle")} intro={t("institutional.aboutIntro")} showHero={false}>
      <section className="px-4 pb-20 pt-28 md:px-8 md:pb-32 md:pt-40">
        <div className="about-story mx-auto max-w-[1540px] after:block after:clear-both after:content-['']">
          <div className="parigo-frame relative mb-8 aspect-[4/3] overflow-hidden border border-[var(--line-strong)] lg:float-left lg:mb-5 lg:mr-8 lg:w-[55%] xl:mr-10 xl:w-[58%]">
            <Image
              src="/images/synchros/le-monde-de-demain2.jpg"
              alt="Le Monde de demain — Parigo"
              fill
              loading="eager"
              sizes="(max-width: 1023px) 100vw, 58vw"
              className="object-cover grayscale transition duration-1000 hover:grayscale-0"
            />
          </div>
          <SignedTitle as="h1" className="font-[var(--font-editorial)] text-5xl font-normal leading-[.93] tracking-[-.05em] md:text-6xl lg:text-7xl">
            {locale === "fr" ? "Une librairie avant tout" : "A music library first"}
          </SignedTitle>
          <div className="mt-7 space-y-5 text-[1.02rem] leading-relaxed text-[var(--text-muted)] lg:mt-8">
            {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </div>
      </section>
    </InstitutionalShell>
  );
}
