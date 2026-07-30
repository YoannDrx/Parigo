import Image from "next/image";
import Link from "next/link";
import type { ComposerProfile } from "@/lib/editorial/contracts";
import { composerRoleLabel } from "@/lib/editorial/composer-role";
import type { Locale } from "@/i18n/messages";
import { localizedPath } from "@/lib/locale";

export function ComposerCard({ profile, locale }: { profile: ComposerProfile; locale: Locale }) {
  const type = composerRoleLabel(profile, locale);
  return (
    <Link
      href={localizedPath(locale, `/compositeurs/${profile.slug}`)}
      className="composer-card group relative overflow-hidden border border-[var(--line)] bg-[var(--surface)]"
    >
      <div className="composer-card__media relative aspect-[4/5] overflow-hidden border-b border-[var(--line)] bg-[var(--surface-soft)]">
        <Image
          src={profile.image}
          alt={profile.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition duration-700 group-hover:scale-[1.035] group-focus-visible:scale-[1.035]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/36 via-transparent to-transparent opacity-70 transition group-hover:opacity-90" />
      </div>
      <div className="relative min-h-28 p-4 sm:p-5">
        <p className="font-mono text-[.54rem] uppercase tracking-[.14em] text-[var(--signal-strong)]">{type}</p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-.035em] sm:text-2xl">{profile.name}</h2>
        <span className="mt-4 inline-flex text-xs font-semibold text-[var(--text-muted)] transition group-hover:translate-x-1 group-hover:text-[var(--foreground)]">
          {locale === "fr" ? "Voir le profil →" : "View profile →"}
        </span>
      </div>
      <span aria-hidden="true" className="composer-card__corner composer-card__corner--top" />
      <span aria-hidden="true" className="composer-card__corner composer-card__corner--bottom" />
    </Link>
  );
}
