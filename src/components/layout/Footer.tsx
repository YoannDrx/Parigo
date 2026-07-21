"use client";

import Link from "next/link";
import { ArrowRight, Facebook, Instagram, Link2, Linkedin, Music2, Youtube } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useAuthModalStore } from "@/stores/auth-modal-store";
import { ParigoLogo } from "./ParigoLogo";

export function Footer() {
  const { locale, t } = useI18n();
  const openRegister = useAuthModalStore((state) => state.openRegister);
  const groups = [
    { title: t("footer.explore"), links: [{ name: t("common.search"), href: "/search" }, { name: t("common.albums"), href: "/albums" }, { name: t("common.playlists"), href: "/playlists" }, { name: locale === "fr" ? "Synchronisations" : "Synchronisations", href: "/synchronisations" }, { name: "Collections", href: "/collections" }] },
    { title: t("footer.studio"), links: [{ name: t("common.about"), href: "/about" }, { name: t("common.licensing"), href: "/licensing" }, { name: t("common.contact"), href: "/contact" }] },
    { title: t("footer.legal"), links: [{ name: t("footer.legalNotice"), href: "/legal" }, { name: t("footer.privacy"), href: "/privacy" }, { name: t("footer.terms"), href: "/terms" }, { name: locale === "fr" ? "Réservation des droits" : "Reservation of rights", href: "/rights" }] },
  ];
  const socials = [
    { name: "Instagram", href: "https://www.instagram.com/parigoproductionmusic", icon: Instagram },
    { name: "YouTube", href: "https://www.youtube.com/@parigoproductionmusic", icon: Youtube },
    { name: "LinkedIn", href: "https://www.linkedin.com/company/parigo/?viewAsMember=true", icon: Linkedin },
    { name: "Facebook", href: "https://www.facebook.com/Parigomusic", icon: Facebook },
    { name: "Spotify", href: "https://open.spotify.com/user/zy4tz4ibp2hi7qvf315g5dv85/playlists", icon: Music2 },
    { name: "Linktree", href: "https://linktr.ee/parigomusicproduction?utm_source=linktree_profile_share&ltsid=0194467e-aa2a-4573-9f3a-63c72b5b8c67", icon: Link2 },
  ];

  return (
    <footer className="bg-[var(--surface-inverse)] px-4 pb-7 pt-12 text-[var(--background)] md:px-8 md:pt-16">
      <div className="mx-auto max-w-[1680px]">
        <div className="grid gap-10 border-b border-current/18 pb-12 md:grid-cols-12 md:pb-16">
          <div className="md:col-span-5">
            <Link href="/" aria-label={locale === "fr" ? "Parigo — Accueil" : "Parigo — Home"} className="group inline-flex"><ParigoLogo className="text-[clamp(2.8rem,5.5vw,5.6rem)]" /></Link>
            <p className="mt-6 max-w-sm text-sm leading-relaxed opacity-58">{t("footer.statement")}</p>
          </div>
          <div className="grid grid-cols-2 gap-8 md:col-span-6 md:col-start-7 md:grid-cols-3">
            {groups.map((group) => (
              <div key={group.title}>
                <h3 className="eyebrow mb-5 opacity-42">{group.title}</h3>
                <ul className="space-y-2.5 text-sm">{group.links.map((link) => <li key={link.href}><Link href={link.href} className="opacity-66 transition hover:text-[var(--signal)] hover:opacity-100">{link.name}</Link></li>)}</ul>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-8 border-b border-current/18 py-8 md:grid-cols-12 md:items-center">
          <div className="md:col-span-5">
            <p className="text-sm font-semibold">{t("footer.newsletter")}</p>
            <p className="mt-1 text-xs opacity-48">{locale === "fr" ? "Une sélection, sans bruit inutile." : "A considered selection, without the noise."}</p>
          </div>
          <button type="button" onClick={openRegister} className="flex min-h-12 w-full items-center justify-between border-b border-current/32 text-left md:col-span-4 md:col-start-7">
            <span className="px-1 text-sm opacity-68">{locale === "fr" ? "Créer un compte Parigo" : "Create a Parigo account"}</span>
            <span className="flex h-12 w-12 items-center justify-center transition hover:text-[var(--signal)]" aria-label={t("footer.subscribe")}><ArrowRight size={18} /></span>
          </button>
          <div className="flex gap-1 md:col-span-2 md:justify-end">
            {socials.map(({ name, href, icon: Icon }) => <a key={name} href={href} target="_blank" rel="noreferrer" aria-label={name} className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] opacity-58 transition hover:bg-[var(--signal)] hover:text-white hover:opacity-100"><Icon size={16} /><span className="sr-only">{name}</span></a>)}
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-6 text-xs opacity-48 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Parigo Music · {t("footer.rights")}</p>
          <button type="button" onClick={() => window.dispatchEvent(new Event("parigo:open-cookie-preferences"))} className="min-h-11 w-fit transition hover:text-[var(--signal)]">{locale === "fr" ? "Gérer les cookies" : "Cookie settings"}</button>
        </div>
      </div>
    </footer>
  );
}
