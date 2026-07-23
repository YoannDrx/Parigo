"use client";

import { ContactForm } from "@/components/features/ContactForm";
import { InstitutionalShell } from "@/components/layout/InstitutionalShell";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Track } from "@/types";

export function ContactExperience({ track, requestedTrackId }: { track: Track | null; requestedTrackId?: string }) {
  const { locale, t } = useI18n();
  const isLicenceRequest = Boolean(requestedTrackId);
  const title = isLicenceRequest
    ? track
      ? locale === "fr" ? `Licencier « ${track.title} ».` : `License “${track.title}”.`
      : locale === "fr" ? "Demander une licence pour ce morceau." : "Request a licence for this track."
    : t("institutional.contactTitle");
  const intro = isLicenceRequest
    ? locale === "fr"
      ? "Les références musicales sont déjà jointes. Ajoutez le contexte du projet, les médias, territoires et échéances : notre équipe pourra cadrer les droits plus rapidement."
      : "The music references are already attached. Add the project context, media, territories and deadlines so our team can define the rights more quickly."
    : t("institutional.contactIntro");

  return <InstitutionalShell eyebrow={isLicenceRequest ? (locale === "fr" ? "Demande de licence" : "Licence request") : t("institutional.contactEyebrow")} title={title} intro={intro}>
    <section className="px-4 py-24 md:px-8 md:py-40"><div className="mx-auto grid max-w-[1500px] gap-16 md:grid-cols-12"><div className="md:col-span-4">
      {isLicenceRequest && <div className="mb-10 border-l-2 border-[var(--signal)] bg-[var(--surface-soft)] px-5 py-5"><p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Morceau concerné" : "Selected track"}</p><p className="mt-3 font-[var(--font-editorial)] text-2xl font-semibold leading-tight">{track?.title || requestedTrackId}</p>{track?.albumTitle && <p className="mt-2 text-sm text-[var(--text-muted)]">{track.albumTitle}</p>}<p className="mt-3 font-mono text-[.62rem] text-[var(--text-muted)]">{track?.cdCode || requestedTrackId}</p></div>}
      <p className="eyebrow text-[var(--color-primary-dark)]">Parigo Music</p><address className="mt-6 not-italic text-lg leading-relaxed text-[var(--text-muted)]">Paris, France<br /><a href="mailto:contact@parigomusic.com" className="underline">contact@parigomusic.com</a></address><p className="mt-10 text-sm leading-relaxed opacity-45">{locale === "fr" ? "Les informations de contact restent à confirmer avec le client avant mise en production." : "Contact details remain to be confirmed with the client before production."}</p></div><div className="md:col-span-7 md:col-start-6"><ContactForm track={track} requestedTrackId={requestedTrackId} /></div></div></section>
  </InstitutionalShell>;
}
