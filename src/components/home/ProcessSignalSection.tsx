import { AudioLines, FilePenLine, ListChecks, type LucideIcon } from "lucide-react";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { HomeReveal } from "./HomeMotion";

type ProcessStepProps = {
  title: string;
  copy: string;
  icon: LucideIcon;
};

function ProcessStep({ title, copy, icon: Icon }: ProcessStepProps) {
  return (
    <article data-testid="process-card" className="process-card parigo-frame group flex min-h-[18rem] flex-col items-center justify-center border border-[var(--line-strong)] bg-[var(--surface)] p-6 text-center md:min-h-[20rem] md:p-7 lg:p-8">
      <div className="process-card__icon grid h-14 w-14 place-items-center border border-[var(--line-strong)] text-[var(--signal-strong)] transition-colors duration-300 group-hover:border-[var(--signal-strong)] group-hover:bg-[color-mix(in_srgb,var(--signal)_10%,var(--surface))]">
        <Icon aria-hidden="true" size={23} strokeWidth={1.55} />
      </div>
      <div className="mt-8 flex flex-col items-center">
        <h3 className="max-w-[15ch] text-[clamp(1.55rem,2.4vw,2.2rem)] font-semibold leading-[1.02] tracking-[-.05em] text-[var(--foreground)]">{title}</h3>
        <p className="mt-5 max-w-[22rem] text-sm leading-7 text-[var(--text-muted)]">{copy}</p>
      </div>
    </article>
  );
}

export function ProcessSignalSection({ locale }: { locale: "fr" | "en" }) {
  const steps: ProcessStepProps[] = locale === "fr" ? [
    { title: "Décrivez", copy: "Une scène, une émotion, un rythme ou quelques références suffisent pour lancer la recherche.", icon: FilePenLine },
    { title: "Écoutez & comparez", copy: "Préécoutez, ouvrez les métadonnées, comparez les versions et construisez votre sélection de travail.", icon: AudioLines },
    { title: "Sélectionnez & licenciez", copy: "Partagez une playlist, téléchargez les formats autorisés ou confiez-nous votre brief.", icon: ListChecks },
  ] : [
    { title: "Describe", copy: "A scene, a feeling, a rhythm or a few references are enough to begin the search.", icon: FilePenLine },
    { title: "Listen & compare", copy: "Preview, open metadata, compare versions and build your working selection.", icon: AudioLines },
    { title: "Select & license", copy: "Share a playlist, download authorised formats or send us your brief.", icon: ListChecks },
  ];

  return (
    <section id="process" className="relative px-[var(--space-page-gutter)] py-[var(--space-section-y-large)]">
      <div className="mx-auto max-w-[1580px]">
        <div className="grid items-end gap-8 lg:grid-cols-12">
          <HomeReveal origin="left" className="lg:col-span-7">
            <p className="mb-5 font-mono text-[.62rem] uppercase tracking-[.16em] text-[var(--signal-strong)]">{locale === "fr" ? "Notre méthode" : "Our method"}</p>
            <SignedTitle as="h2" className="max-w-[13ch] text-[clamp(2.8rem,5vw,5.5rem)] leading-[.91] text-[var(--foreground)]">{locale === "fr" ? "Du brief à la sélection." : "From brief to selection."}</SignedTitle>
          </HomeReveal>
          <HomeReveal origin="right" delay={0.08} className="lg:col-span-4 lg:col-start-9">
            <p className="max-w-md text-sm leading-7 text-[var(--text-muted)]">{locale === "fr" ? "Un chemin simple, de l’intention musicale à une sélection prête à partager." : "A simple path from musical intent to a selection ready to share."}</p>
          </HomeReveal>
        </div>
        <HomeReveal origin="bottom" delay={0.12} className="mt-12 md:mt-16">
          <div className="grid gap-4 md:grid-cols-3 lg:gap-6">
            {steps.map((step) => <ProcessStep key={step.title} {...step} />)}
          </div>
        </HomeReveal>
      </div>
    </section>
  );
}
