"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { UserMenu } from "@/components/features";
import { useI18n } from "@/components/providers/I18nProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";
import { ParigoLogo } from "./ParigoLogo";
import { Tooltip } from "@/components/ui";

interface HeaderProps { variant?: "default" | "overlay"; }

export function Header({ variant = "default" }: HeaderProps) {
  const pathname = usePathname();
  const { locale, t, toggleLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [menuState, setMenuState] = useState({ pathname, open: false });
  const [headerVisible, setHeaderVisible] = useState(true);
  const previousScrollY = useRef(0);
  const open = menuState.pathname === pathname && menuState.open;

  useEffect(() => {
    const updateHeader = () => {
      const currentY = window.scrollY;
      const delta = currentY - previousScrollY.current;
      if (currentY < 72 || delta < -8) setHeaderVisible(true);
      else if (delta > 8 && currentY > 110 && !open) setHeaderVisible(false);
      previousScrollY.current = currentY;
    };
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuState({ pathname, open: false });
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, pathname]);

  const nav = [
    { name: t("common.search"), href: "/search", note: locale === "fr" ? "Par humeur, style ou usage" : "By mood, style or use" },
    { name: t("common.albums"), href: "/albums", note: locale === "fr" ? "Explorer le catalogue" : "Explore the catalogue" },
    { name: t("common.playlists"), href: "/playlists", note: locale === "fr" ? "Sélections éditoriales" : "Editorial selections" },
    { name: "Synchronisations", href: "/synchronisations", note: locale === "fr" ? "La musique en images" : "Music in motion" },
    { name: "Collections", href: "/collections", note: locale === "fr" ? "Répertoires choisis" : "Curated repertoires" },
    { name: t("common.labels"), href: "/labels", note: locale === "fr" ? "Nos maisons partenaires" : "Our label partners" },
    { name: t("common.licensing"), href: "/licensing", note: locale === "fr" ? "Comprendre les droits" : "Understand the rights" },
  ];

  const primaryNav = nav.slice(0, 4);

  return (
    <motion.header
      data-variant={variant}
      animate={{ y: headerVisible || open ? 0 : -82 }}
      transition={{ duration: .28, ease: [.22, 1, .36, 1] }}
      className="fixed inset-x-0 top-0 z-[80] w-full text-[var(--foreground)]"
    >
      <nav aria-label={locale === "fr" ? "Navigation principale" : "Main navigation"} className="relative z-[2] grid h-[74px] w-full grid-cols-[1fr_auto] items-center border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] px-4 shadow-[0_12px_40px_rgba(15,22,16,.055)] backdrop-blur-2xl md:px-8 lg:grid-cols-[190px_minmax(0,1fr)_auto]">
        <Link href="/" aria-label={locale === "fr" ? "Parigo — Accueil" : "Parigo — Home"} className="group justify-self-start focus-visible:outline-offset-8">
          <ParigoLogo className="text-[1.75rem] md:text-[1.95rem]" />
        </Link>

        <div className="hidden justify-self-center rounded-full border border-[var(--line)] bg-[color-mix(in_srgb,var(--background)_62%,transparent)] p-1 shadow-[0_8px_28px_rgba(15,22,16,.05)] lg:flex">
          {primaryNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={cn("nav-link relative flex min-h-10 items-center rounded-full px-4 text-[.64rem] font-semibold uppercase tracking-[.09em] text-[var(--text-muted)] xl:px-5", active && "bg-[var(--signal-soft)] text-[var(--signal-strong)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--signal-strong)_18%,transparent)] hover:!bg-[var(--signal-soft)] hover:!text-[var(--signal-strong)]")}>{item.name}</Link>
            );
          })}
        </div>

        <div className="flex h-full items-center justify-end gap-1">
          <div className="hidden items-center lg:flex">
            <Tooltip label={locale === "fr" ? "Passer en anglais" : "Switch to French"} side="bottom"><button type="button" onClick={toggleLocale} className="nav-control h-11 w-11 rounded-full font-mono text-[.64rem] font-semibold tracking-[.12em]" aria-label={`${t("common.language")} — ${locale === "fr" ? "English" : "Français"}`}>{locale === "fr" ? "EN" : "FR"}</button></Tooltip>
            <Tooltip label={theme === "light" ? t("common.themeDark") : t("common.themeLight")} side="bottom"><button type="button" onClick={toggleTheme} className="nav-control h-11 w-11 rounded-full" aria-label={theme === "light" ? t("common.themeDark") : t("common.themeLight")}>{theme === "light" ? <Moon size={16} /> : <Sun size={16} />}</button></Tooltip>
          </div>
          <div className="hidden xl:block"><UserMenu compact /></div>
          <Tooltip label={open ? t("nav.closeMenu") : t("nav.openMenu")} side="bottom"><button type="button" onClick={() => setMenuState({ pathname, open: !open })} aria-expanded={open} aria-controls="global-menu" aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")} className="nav-control h-11 w-11 rounded-full border border-[var(--line)]">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button></Tooltip>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div id="global-menu" role="dialog" aria-modal="true" aria-label={locale === "fr" ? "Menu principal" : "Main menu"} initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: .3, ease: [.22, 1, .36, 1] }} className="fixed inset-x-0 bottom-0 top-[74px] z-[1] overflow-y-auto bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] text-[var(--foreground)] shadow-[0_34px_100px_rgba(15,22,16,.14)] backdrop-blur-2xl">
            <div className="mx-auto grid min-h-full max-w-[1760px] px-4 py-8 md:grid-cols-12 md:px-8 md:py-12">
              <div className="md:col-span-8 lg:col-span-9 lg:pr-12">
                <p className="eyebrow mb-5 text-[var(--signal-strong)]">{locale === "fr" ? "Explorer Parigo" : "Explore Parigo"}</p>
                <div className="border-t border-[var(--line)]">
                  {nav.map((item, index) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <motion.div key={item.href} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .028 }}>
                        <Link href={item.href} className={cn("group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 border-b border-[var(--line)] py-3 transition-colors duration-300 hover:text-[var(--signal-strong)] md:grid-cols-[2.5rem_minmax(0,1fr)_minmax(140px,.42fr)_auto] md:gap-5 md:py-4", active && "text-[var(--signal-strong)]")}>
                          <span className="font-mono text-[.56rem] text-[var(--text-muted)]">0{index + 1}</span>
                          <span className="text-[clamp(1.55rem,3.25vw,3.4rem)] font-semibold leading-none tracking-[-.05em]">{item.name}</span>
                          <span className="hidden text-xs leading-relaxed text-[var(--text-muted)] md:block">{item.note}</span>
                          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-current/25 transition duration-300 group-hover:-rotate-12 group-hover:border-current group-hover:bg-[var(--signal)] group-hover:text-white"><ArrowUpRight size={15} /></span>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <aside className="mt-10 flex flex-col gap-8 border-t border-[var(--line)] pt-7 md:col-span-4 md:mt-0 md:border-l md:border-t-0 md:pl-8 md:pt-0 lg:col-span-3">
                <div className="xl:hidden">
                  <p className="eyebrow mb-4 text-[var(--text-muted)]">{t("common.account")}</p>
                  <div className="[&_button]:w-full [&_button]:justify-start [&_button]:rounded-[var(--radius-md)] [&_button_span]:inline"><UserMenu /></div>
                </div>

                <div className="lg:hidden">
                  <p className="eyebrow mb-4 text-[var(--text-muted)]">{locale === "fr" ? "Préférences" : "Preferences"}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={toggleLocale} className="flex min-h-14 items-center justify-between border border-[var(--line)] px-4 text-left text-xs font-semibold transition hover:border-[var(--signal)] hover:bg-[var(--signal-soft)]" aria-label={`${t("common.language")} — ${locale === "fr" ? "English" : "Français"}`}><span>{locale === "fr" ? "Langue" : "Language"}</span><span className="font-mono text-[.65rem] text-[var(--signal-strong)]">{locale === "fr" ? "EN" : "FR"}</span></button>
                    <button onClick={toggleTheme} className="flex min-h-14 items-center justify-between border border-[var(--line)] px-4 text-left text-xs font-semibold transition hover:border-[var(--signal)] hover:bg-[var(--signal-soft)]" aria-label={theme === "light" ? t("common.themeDark") : t("common.themeLight")}><span>{locale === "fr" ? "Thème" : "Theme"}</span>{theme === "light" ? <Moon size={16} /> : <Sun size={16} />}</button>
                  </div>
                </div>

                <div className="grid gap-2 text-sm text-[var(--text-muted)]">
                  <Link href="/about" className="min-h-9 hover:text-[var(--foreground)]">{t("common.about")}</Link>
                  <Link href="/contact" className="min-h-9 hover:text-[var(--foreground)]">{t("common.contact")}</Link>
                  <Link href="/legal" className="min-h-9 hover:text-[var(--foreground)]">{t("footer.legalNotice")}</Link>
                  <Link href="/privacy" className="min-h-9 hover:text-[var(--foreground)]">{t("footer.privacy")}</Link>
                </div>
                <p className="eyebrow mt-auto text-[var(--text-muted)]">Music for images<br />Paris · France</p>
              </aside>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
