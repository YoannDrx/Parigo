import { AudioLines, FilePenLine, ListChecks, type LucideIcon } from "lucide-react";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { HomeReveal } from "./HomeMotion";

type ProcessStepProps = {
  title: string;
  copy: string;
  icon: LucideIcon;
  index?: number;
};

function ProcessStep({ title, copy, icon: Icon, index = 0 }: ProcessStepProps) {
  return (
    <article data-testid="process-card" data-step={index + 1} className="process-card parigo-frame group flex min-h-[18rem] flex-col items-center justify-center border border-white/20 bg-[#11120f] p-6 text-center md:min-h-[20rem] md:p-7 lg:p-8">
      <div className="process-card__icon grid h-14 w-14 place-items-center border border-white/25 text-[var(--signal-strong)] transition-colors duration-300 group-hover:border-[var(--signal-strong)] group-hover:bg-[color-mix(in_srgb,var(--signal)_10%,#11120f)]">
        <Icon aria-hidden="true" size={23} strokeWidth={1.55} />
      </div>
      <div className="mt-8 flex flex-col items-center">
        <h3 className="max-w-[15ch] text-[clamp(1.55rem,2.4vw,2.2rem)] font-semibold leading-[1.02] tracking-[-.05em] text-[#f2f1ed]">{title}</h3>
        <p className="mt-5 max-w-[22rem] text-sm leading-7 text-[#b9beb8]">{copy}</p>
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
        <div>
          <HomeReveal origin="left">
            <SignedTitle as="h2" className="max-w-[13ch] text-[clamp(2.8rem,5vw,5.5rem)] leading-[.91] text-[var(--foreground)]">{locale === "fr" ? "Du brief à la sélection." : "From brief to selection."}</SignedTitle>
          </HomeReveal>
        </div>
        <HomeReveal origin="bottom" delay={0.12} className="mt-12 md:mt-16">
          <div className="grid gap-4 md:grid-cols-3 lg:gap-6">
            {steps.map((step, index) => <ProcessStep key={step.title} {...step} index={index} />)}
          </div>
        </HomeReveal>
      </div>
    </section>
  );
}
