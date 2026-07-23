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
    <section className="bg-[var(--surface-soft)] px-4 py-16 md:px-8 md:py-24"><div className="mx-auto grid max-w-[1500px] gap-6 md:grid-cols-12"><div className="parigo-frame h-fit border border-[var(--line)] bg-[var(--surface)] p-6 md:col-span-4 md:p-8">
      {isLicenceRequest && <div className="parigo-frame mb-8 border border-[var(--line)] bg-[var(--signal-soft)] px-5 py-5"><p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Morceau concerné" : "Selected track"}</p><p className="mt-3 font-[var(--font-editorial)] text-2xl font-semibold leading-tight">{track?.title || requestedTrackId}</p>{track?.albumTitle && <p className="mt-2 text-sm text-[var(--text-muted)]">{track.albumTitle}</p>}<p className="mt-3 break-all font-mono text-[.62rem] text-[var(--text-muted)]">{track?.cdCode || requestedTrackId}</p></div>}
      <p className="eyebrow text-[var(--color-primary-dark)]">Parigo Music</p><address className="mt-6 not-italic text-lg leading-relaxed text-[var(--text-muted)]">Paris, France<br /><a href="mailto:contact@parigomusic.com" className="break-all underline decoration-[var(--signal-strong)]/35 underline-offset-4">contact@parigomusic.com</a></address><p className="mt-10 border-t border-[var(--line)] pt-6 text-sm leading-relaxed opacity-45">{locale === "fr" ? "Les informations de contact restent à confirmer avec le client avant mise en production." : "Contact details remain to be confirmed with the client before production."}</p></div><div className="parigo-frame min-w-0 border border-[var(--line-strong)] bg-[var(--surface)] p-5 md:col-span-8 md:p-8 lg:p-10"><ContactForm track={track} requestedTrackId={requestedTrackId} /></div></div></section>
  </InstitutionalShell>;
}
