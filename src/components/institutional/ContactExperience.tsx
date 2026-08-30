"use client";

import Image from "next/image";
import { ContactForm } from "@/components/features/ContactForm";
import { InstitutionalShell } from "@/components/layout/InstitutionalShell";
import { useI18n } from "@/components/providers/I18nProvider";
import { SignedTitle } from "@/components/ui/SignedTitle";
import type { Track } from "@/types";

const TEAM = [
  {
    name: "Guillaume Albeck",
    role: { fr: "Président", en: "President" },
    email: "guillaume.albeck@parigomusic.com",
  },
  {
    name: "Caroline Senyk",
    role: {
      fr: "Responsable copyright et production musicale",
      en: "Head of Copyright and Music Production",
    },
    email: "caroline.senyk@parigomusic.com",
  },
  {
    name: "Eliott Grellier",
    role: { fr: "Responsable catalogue", en: "Library manager" },
    email: "eliott.grellier@parigomusic.com",
  },
] as const;

function ContactLocationImage({ locale }: { locale: "fr" | "en" }) {
  return (
    <Image
      src="/images/editorial/parigo-selected/r03-v1-contact-1672x941.avif"
      alt={locale === "fr"
        ? "Façade des bureaux Parigo à l’angle de la rue Rémy Dumoncel à Paris"
        : "Parigo's offices on the corner of rue Rémy Dumoncel in Paris"}
      fill
      preload
      sizes="(max-width: 1599px) 100vw, 1500px"
      data-testid="contact-location-image"
      className="object-cover object-center"
    />
  );
}

export function ContactExperience({ track, requestedTrackId }: { track: Track | null; requestedTrackId?: string }) {
  const { locale, t } = useI18n();
  const isLicenceRequest = Boolean(requestedTrackId);
  const title = isLicenceRequest
    ? track
      ? locale === "fr" ? `Licencier « ${track.title} ».` : `License “${track.title}”.`
      : locale === "fr" ? "Demander une licence pour ce morceau." : "Request a licence for this track."
    : t("institutional.contactTitle");
  const intro = isLicenceRequest
    ? locale === "fr"
      ? "Les références musicales sont déjà jointes. Ajoutez le contexte du projet, les médias, territoires et échéances : notre équipe pourra cadrer les droits plus rapidement."
      : "The music references are already attached. Add the project context, media, territories and deadlines so our team can define the rights more quickly."
    : t("institutional.contactIntro");

  return (
    <InstitutionalShell title={title} intro={intro} showHero={false}>
      <h1 className="sr-only">{title}</h1>
      <section className="bg-[var(--background)] px-[var(--space-page-gutter)] pb-[var(--space-section-y-large)] pt-[calc(74px+var(--space-page-hero-follow))]">
        <div className="mx-auto max-w-[1500px]">
          <figure data-testid="contact-image-frame" className="parigo-frame relative aspect-[16/10] w-full overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] sm:aspect-[16/8] lg:aspect-[16/7]">
            <ContactLocationImage locale={locale} />
          </figure>

          <div data-testid="contact-split" className="mt-5 grid gap-5 lg:grid-cols-12 lg:items-start lg:gap-6">
            <aside data-testid="contact-details" className="h-fit lg:sticky lg:top-[var(--sticky-offset)] lg:col-span-4 lg:self-start">
              <div className="parigo-frame grid gap-6 border border-[var(--line)] bg-[var(--surface)] p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-1">
                <div>
                  <p className="eyebrow text-[var(--color-primary-dark)]">Parigo Music</p>
                  <address className="mt-4 not-italic text-base leading-relaxed text-[var(--text-muted)]">
                    9, rue Rémy Dumoncel<br />
                    75014 Paris, France<br />
                    <a href="tel:+33149239476" className="mt-3 block w-fit underline decoration-[var(--signal-strong)]/35 underline-offset-4">+33 (0)1 49 23 94 76</a>
                    <a href="mailto:info@parigomusic.com" className="block w-fit break-all underline decoration-[var(--signal-strong)]/35 underline-offset-4">info@parigomusic.com</a>
                  </address>
                </div>
                <p className="border-t border-[var(--line)] pt-6 text-sm leading-relaxed text-[var(--text-muted)] sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 lg:border-l-0 lg:border-t lg:pl-0 lg:pt-6">
                  <span className="block">{locale === "fr" ? "Une question urgente ? Appelez-nous\u00a0:" : "Need a quick answer? Call us:"}</span>
                  <a href="tel:+33649396922" className="mt-2 block w-fit whitespace-nowrap text-lg font-normal text-[var(--foreground)] underline decoration-[var(--signal-strong)]/50 underline-offset-4">
                    +33 (0)6 49 39 69 22
                  </a>
                </p>
              </div>
            </aside>

            <div data-testid="contact-main" className="parigo-frame min-w-0 border border-[var(--line-strong)] bg-[var(--surface)] p-5 sm:p-8 lg:col-span-8 lg:p-10">
              {isLicenceRequest ? (
                <div className="parigo-frame mb-8 border border-[var(--line)] bg-[var(--signal-soft)] px-5 py-5">
                  <p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Morceau concerné" : "Selected track"}</p>
                  <p className="mt-3 font-[var(--font-editorial)] text-2xl font-semibold leading-tight">{track?.title || requestedTrackId}</p>
                  {track?.albumTitle ? <p className="mt-2 text-sm text-[var(--text-muted)]">{track.albumTitle}</p> : null}
                  <p className="mt-3 break-all font-mono text-[.62rem] text-[var(--text-muted)]">{track?.cdCode || requestedTrackId}</p>
                </div>
              ) : null}
              <ContactForm track={track} requestedTrackId={requestedTrackId} />
            </div>
          </div>
        </div>

        <div data-testid="contact-team" className="mx-auto mt-[var(--space-section-y-large)] max-w-[1500px]">
          <div>
            <SignedTitle as="h2" variant="section">
              {locale === "fr" ? "Notre équipe" : "Our team"}
            </SignedTitle>
          </div>
          <div className="mt-[var(--space-heading-content)] grid gap-[var(--space-grid-x)] md:grid-cols-3">
            {TEAM.map((member) => (
              <article key={member.email} className="parigo-frame group flex min-h-56 flex-col border border-[var(--line-strong)] bg-[var(--surface)] p-6 transition duration-300 hover:-translate-y-1 hover:border-[var(--signal-strong)] hover:shadow-[0_20px_55px_rgba(17,32,20,.09)] focus-within:-translate-y-1 focus-within:border-[var(--signal-strong)] md:p-8">
                <h3 className="text-2xl font-semibold tracking-[-.04em]">{member.name}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{member.role[locale]}</p>
                <a href={`mailto:${member.email}`} className="mt-auto block w-fit max-w-full break-all border-b border-[var(--line-strong)] pb-1 pt-8 text-sm font-semibold transition group-hover:border-[var(--signal-strong)] group-hover:text-[var(--signal-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-strong)]">
                  {member.email}
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>
    </InstitutionalShell>
  );
}
