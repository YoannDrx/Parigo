"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, Facebook, Instagram, Link2, Linkedin, Music2, Youtube } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useAuthModalStore } from "@/stores/auth-modal-store";
import { ParigoLogo } from "./ParigoLogo";

export function Footer() {
  const { locale, t, localizedPath } = useI18n();
  const openRegister = useAuthModalStore((state) => state.openRegister);
  const groups = [
    {
      title: t("footer.explore"),
      wide: true,
      links: [
        { name: t("common.search"), href: "/search" },
        { name: locale === "fr" ? "Labels représentés" : "Represented labels", href: "/labels" },
        { name: locale === "fr" ? "Label Parigo" : "Parigo Label", href: "/label-parigo" },
        { name: t("common.albums"), href: "/albums" },
        { name: locale === "fr" ? "Synchronisations" : "Syncs", href: "/synchronisations" },
        { name: t("common.playlists"), href: "/playlists" },
        { name: t("common.licensing"), href: "/licensing" },
        { name: "Clips", href: "/clips" },
        { name: locale === "fr" ? "Compositeurs" : "Composers", href: "/compositeurs" },
      ],
    },
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
    <footer className="parigo-footer relative overflow-hidden bg-[var(--surface-inverse)] px-4 pb-7 pt-12 text-[var(--inverse-foreground)] md:px-8 md:pt-16">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-12 h-72 w-72 rounded-full border-[48px] border-current/[.025] md:h-[30rem] md:w-[30rem] md:border-[72px]" />
      <div className="relative mx-auto max-w-[1680px]">
        <div className="grid gap-12 border-b border-current/18 pb-12 lg:grid-cols-12 lg:gap-8 lg:pb-16">
          <div className="lg:col-span-4">
            <div className="w-fit">
              <Link href={localizedPath("/")} aria-label={locale === "fr" ? "Parigo — Accueil" : "Parigo — Home"} className="group flex focus-visible:outline-offset-8"><ParigoLogo className="text-[clamp(2.8rem,5vw,5.2rem)]" /></Link>
            </div>
            <p className="mt-6 max-w-sm text-[clamp(1.2rem,2vw,1.8rem)] font-medium leading-[1.15] tracking-[-.035em] text-[var(--inverse-muted)]">
              {t("footer.statement")}
            </p>
            <a href="mailto:info@parigomusic.com" className="group mt-8 inline-flex min-h-11 items-center gap-2 border-b border-current/30 text-sm font-semibold transition hover:border-[var(--inverse-accent)] hover:text-[var(--inverse-accent)]">
              <span>info@parigomusic.com</span>
              <ArrowUpRight size={14} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-9 lg:col-span-7 lg:col-start-6 lg:grid-cols-7 lg:gap-x-6 lg:gap-y-10">
            {groups.map((group) => (
              <div key={group.title} className={group.wide ? "col-span-2 lg:col-span-3" : "col-span-1 min-w-0 lg:col-span-2"}>
                <h3 className="eyebrow mb-5 flex items-center gap-2 text-[var(--inverse-muted)]">
                  <span className="h-px w-5 bg-[var(--inverse-accent)]" />
                  {group.title}
                </h3>
                <ul className={group.wide ? "grid grid-cols-2 gap-x-5 gap-y-1 text-sm" : "grid min-w-0 gap-1 text-[.82rem] sm:text-sm"}>
                  {group.links.map((link) => (
                    <li key={link.href} className="min-w-0">
                      <Link href={localizedPath(link.href)} className="footer-reveal-link group/link block min-h-8 min-w-0 py-1 text-[var(--inverse-muted)] focus-visible:text-[var(--inverse-accent)]">
                        <span className="footer-reveal-link__track relative block overflow-hidden">
                          <span className="footer-reveal-link__copy block break-words transition-transform duration-300 ease-out group-hover/link:-translate-y-full group-focus-visible/link:-translate-y-full">{link.name}</span>
                          <span aria-hidden="true" className="footer-reveal-link__copy absolute left-0 top-full block max-w-full break-words text-[var(--inverse-accent)] transition-transform duration-300 ease-out group-hover/link:-translate-y-full group-focus-visible/link:-translate-y-full">{link.name}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-start border-b border-current/18 py-5 md:justify-end">
          <button type="button" onClick={openRegister} className="group inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border border-current/28 px-3 text-left text-xs font-semibold transition duration-300 hover:border-[var(--inverse-accent)] hover:bg-[var(--inverse-accent)] hover:text-[var(--surface-inverse)] focus-visible:border-[var(--inverse-accent)] focus-visible:outline-none">
            <span>
              {locale === "fr" ? "Créer un compte Parigo" : "Create a Parigo account"}
            </span>
            <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>

        <div className="grid gap-6 border-b border-current/18 py-7 md:grid-cols-12 md:items-center">
          <div className="md:col-span-5">
            <p className="text-sm font-semibold">{locale === "fr" ? "Suivre Parigo" : "Follow Parigo"}</p>
            <p className="mt-1 text-xs text-[var(--inverse-muted)]">{locale === "fr" ? "Parutions, images et actualités du label." : "Releases, images and label news."}</p>
          </div>
          <ul className="flex flex-wrap gap-1 md:col-span-7 md:justify-end" aria-label={locale === "fr" ? "Réseaux sociaux" : "Social media"}>
            {socials.map(({ name, href, icon: Icon }) => (
              <li key={name}>
                <a href={href} target="_blank" rel="noreferrer" aria-label={name} className="flex h-11 w-11 items-center justify-center rounded-full border border-transparent opacity-70 transition duration-300 hover:-translate-y-1 hover:border-current/25 hover:bg-[var(--inverse-accent)] hover:text-[var(--surface-inverse)] hover:opacity-100 focus-visible:bg-[var(--inverse-accent)] focus-visible:text-[var(--surface-inverse)]">
                  <Icon size={16} />
                  <span className="sr-only">{name}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-4 pt-6 text-xs text-[var(--inverse-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Parigo Music · {t("footer.rights")}</p>
          <button type="button" onClick={() => window.dispatchEvent(new Event("parigo:open-cookie-preferences"))} className="min-h-11 w-fit transition hover:text-[var(--inverse-accent)]">{locale === "fr" ? "Gérer les cookies" : "Cookie settings"}</button>
        </div>
      </div>
    </footer>
  );
}
