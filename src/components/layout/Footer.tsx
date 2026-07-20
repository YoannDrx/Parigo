"use client";

import Link from "next/link";
import { ArrowUpRight, Facebook, Instagram, Linkedin, Mail, Music2, Youtube } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { RevealText } from "@/components/motion";
import { ParigoLogo } from "./ParigoLogo";

export function Footer() {
  const { locale, t } = useI18n();
  const groups = [
    { title: t("footer.explore"), links: [{ name: t("common.search"), href: "/search" }, { name: t("common.albums"), href: "/albums" }, { name: t("common.playlists"), href: "/playlists" }, { name: t("common.artists"), href: "/artists" }] },
    { title: t("footer.studio"), links: [{ name: t("common.about"), href: "/about" }, { name: t("common.licensing"), href: "/licensing" }, { name: t("common.contact"), href: "/contact" }] },
    { title: t("footer.legal"), links: [{ name: t("footer.legalNotice"), href: "/legal" }, { name: t("footer.privacy"), href: "/privacy" }, { name: t("footer.terms"), href: "/terms" }, { name: locale === "fr" ? "Réservation des droits" : "Reservation of rights", href: "/rights" }] },
  ];
  const socials = [
    { name: "Instagram", href: "https://www.instagram.com/parigoproductionmusic", icon: Instagram },
    { name: "YouTube", href: "https://www.youtube.com/@parigoproductionmusic", icon: Youtube },
    { name: "LinkedIn", href: "https://www.linkedin.com/company/parigo/?viewAsMember=true", icon: Linkedin },
    { name: "Facebook", href: "https://www.facebook.com/Parigomusic", icon: Facebook },
    { name: "Spotify", href: "https://open.spotify.com/user/zy4tz4ibp2hi7qvf315g5dv85/playlists", icon: Music2 },
    { name: "TikTok", href: "https://www.tiktok.com/@parigomusic?is_from_webapp=1&sender_device=pc", icon: Music2 },
  ];

  return (
    <footer className="grain overflow-hidden bg-[var(--surface-inverse)] px-4 pb-7 pt-14 text-[var(--background)] md:px-8 md:pt-20">
      <div className="mx-auto max-w-[1800px]">
        <div className="grid gap-10 border border-current/18 p-6 md:grid-cols-12 md:p-10">
          <div className="md:col-span-7">
            <p className="eyebrow mb-5 opacity-45">Parigo Music · Paris</p>
            <RevealText as="h2" mode="lines" className="max-w-4xl font-[var(--font-editorial)] text-[clamp(2.6rem,4.6vw,5.6rem)] font-normal leading-[.88] tracking-[-.05em]">{t("footer.statement")}</RevealText>
          </div>
          <div className="flex flex-col justify-end border-t border-current/16 pt-7 md:col-span-4 md:col-start-9 md:border-l md:border-t-0 md:pl-9 md:pt-0">
            <p className="mb-4 text-sm opacity-55">{t("footer.newsletter")}</p>
            <form className="flex border-b border-current/28 pb-2" onSubmit={(event) => event.preventDefault()}>
              <label htmlFor="newsletter" className="sr-only">{t("footer.email")}</label>
              <input id="newsletter" type="email" required placeholder={t("footer.email")} className="min-h-11 min-w-0 flex-1 bg-transparent outline-none placeholder:opacity-35" />
              <button type="submit" className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--signal)] text-[#11120f]" aria-label={t("footer.subscribe")}><Mail size={17} /></button>
            </form>
          </div>
        </div>

        <div className="grid gap-12 py-12 md:grid-cols-12">
          <Link href="/" aria-label="Parigo — Accueil" className="group self-start md:col-span-5"><ParigoLogo className="text-[clamp(2rem,4vw,4.5rem)]" /></Link>
          <div className="grid grid-cols-2 gap-10 md:col-span-6 md:col-start-7 md:grid-cols-3">
            {groups.map((group) => <div key={group.title}><h3 className="eyebrow mb-5 opacity-35">{group.title}</h3><ul className="space-y-2.5">{group.links.map((link) => <li key={link.href}><Link href={link.href} className="inline-flex items-center gap-1.5 opacity-68 transition hover:text-[var(--signal)] hover:opacity-100">{link.name}</Link></li>)}</ul></div>)}
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-7 md:col-start-6 md:justify-end">
            {socials.map(({ name, href, icon: Icon }) => <a key={name} href={href} target="_blank" rel="noreferrer" aria-label={name} className="group flex h-11 w-11 items-center justify-center border border-current/18 transition hover:-translate-y-1 hover:border-[var(--signal)] hover:bg-[var(--signal)] hover:text-[#11120f]"><Icon size={17} /><span className="sr-only">{name}</span></a>)}
          </div>
        </div>

        <div className="flex flex-col gap-5 border-t border-current/18 pt-7 text-xs opacity-48 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Parigo Music · {t("footer.rights")}</p>
          <div className="flex flex-wrap items-center gap-5"><button type="button" onClick={() => window.dispatchEvent(new Event("parigo:open-cookie-preferences"))} className="min-h-11 opacity-80 transition hover:text-[var(--signal)] hover:opacity-100">{locale === "fr" ? "Gérer les cookies" : "Cookie settings"}</button><Link href="/contact" className="inline-flex min-h-11 items-center gap-2 opacity-80 transition hover:text-[var(--signal)] hover:opacity-100">{t("home.licenseCta")} <ArrowUpRight size={15} /></Link></div>
        </div>
      </div>
    </footer>
  );
}
