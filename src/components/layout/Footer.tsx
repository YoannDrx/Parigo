"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, Facebook, Instagram, Link2, Linkedin, Mail, Music2, Youtube } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useAuthModalStore } from "@/stores/auth-modal-store";
import { ParigoLogo } from "./ParigoLogo";

export function Footer() {
  const { locale, t } = useI18n();
  const openRegister = useAuthModalStore((state) => state.openRegister);
  const groups = [
    { title: t("footer.explore"), links: [{ name: t("common.search"), href: "/search" }, { name: t("common.albums"), href: "/albums" }, { name: t("common.playlists"), href: "/playlists" }, { name: locale === "fr" ? "Synchronisations" : "Syncs", href: "/synchronisations" }, { name: "Collections", href: "/collections" }] },
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
        <section className="relative mb-12 overflow-hidden border-y border-current/18 py-12 md:mb-16 md:py-16" aria-labelledby="footer-brief-title">
          <div aria-hidden="true" className="absolute -right-24 -top-32 h-80 w-80 rounded-full border-[52px] border-[var(--signal)]/10" />
          <div className="relative grid gap-10 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7">
              <p className="eyebrow flex items-center gap-2 text-[var(--signal)]"><span className="h-2 w-2 rounded-full bg-current" />{locale === "fr" ? "Vous ne trouvez pas le bon titre ?" : "Can’t find the right track?"}</p>
              <h2 id="footer-brief-title" className="mt-6 max-w-[16ch] font-[var(--font-rounded)] text-[clamp(2.8rem,5.2vw,5.8rem)] font-extrabold leading-[.92] tracking-[-.045em]">{locale === "fr" ? <>Envoyez-nous un brief.<br />Nous sélectionnons pour vous.</> : <>Send us a brief.<br />We’ll curate for you.</>}</h2>
            </div>
            <div className="md:col-span-4 md:col-start-9">
              <p className="max-w-lg text-sm leading-7 opacity-68">{locale === "fr" ? "Parlez-nous de votre projet, de votre deadline et de vos références. Nos superviseurs musicaux construisent une sélection sur mesure sous 24 heures." : "Tell us about your project, deadline and references. Our music supervisors build a tailored selection within 24 hours."}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/contact?subject=brief" style={{ color: "#101410" }} className="footer-brief-cta inline-flex min-h-12 items-center gap-2 rounded-md border border-[var(--signal)] bg-[var(--signal)] px-5 text-sm font-semibold transition hover:border-white hover:bg-white">{locale === "fr" ? "Envoyer un brief" : "Send a brief"}<ArrowRight size={16} /></Link>
                <a href="mailto:hello@parigomusic.com" className="inline-flex min-h-12 items-center gap-2 rounded-md border border-current/32 px-5 text-sm font-semibold transition hover:border-[var(--signal)] hover:text-[var(--signal)]">{locale === "fr" ? "Contacter l’équipe" : "Contact the team"}<Mail size={15} /></a>
              </div>
            </div>
          </div>
        </section>
        <div className="grid gap-10 border-b border-current/18 pb-12 md:grid-cols-12 md:pb-16">
          <div className="md:col-span-5">
            <div className="w-fit">
              <Link href="/" aria-label={locale === "fr" ? "Parigo — Accueil" : "Parigo — Home"} className="group flex"><ParigoLogo className="text-[clamp(2.8rem,5.5vw,5.6rem)]" /></Link>
              <p className="mt-5 font-mono text-[.62rem] font-semibold uppercase tracking-[.2em] text-[var(--signal)]">Music for images</p>
            </div>
            <p className="mt-6 max-w-sm text-sm leading-relaxed opacity-64">{locale === "fr" ? "Music for images. Membre de la SACEM depuis 2013." : "Music for images. Member of SACEM since 2013."}</p>
            <a href="mailto:hello@parigomusic.com" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold underline decoration-current/30 underline-offset-4 transition hover:text-[var(--signal)]"><span>hello@parigomusic.com</span><ArrowUpRight size={14} /></a>
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
