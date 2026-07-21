"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Moon, Search, Sun, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { UserMenu } from "@/components/features";
import { useI18n } from "@/components/providers/I18nProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";
import { ParigoLogo } from "./ParigoLogo";

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
    { name: t("common.search"), href: "/search" },
    { name: t("common.albums"), href: "/albums" },
    { name: t("common.playlists"), href: "/playlists" },
    { name: locale === "fr" ? "Synchronisations" : "Synchronisations", href: "/synchronisations" },
    { name: "Collections", href: "/collections" },
    { name: t("common.labels"), href: "/labels" },
    { name: t("common.licensing"), href: "/licensing" },
  ];

  return (
    <motion.header
      data-variant={variant}
      animate={{ y: headerVisible || open ? 0 : -92 }}
      transition={{ duration: .28, ease: [.22, 1, .36, 1] }}
      className="fixed inset-x-0 top-0 z-[80] w-full px-3 pt-3 text-[var(--foreground)] md:px-6"
    >
      <nav aria-label={locale === "fr" ? "Navigation principale" : "Main navigation"} className="relative z-[2] mx-auto grid h-16 max-w-[1360px] grid-cols-[1fr_auto] items-center rounded-[1.15rem] border border-white/30 bg-[color-mix(in_srgb,var(--surface)_78%,transparent)] px-4 shadow-[0_12px_40px_rgba(15,22,16,.09)] backdrop-blur-2xl md:grid-cols-[170px_minmax(0,1fr)_auto] md:px-5">
        <Link href="/" aria-label={locale === "fr" ? "Parigo — Accueil" : "Parigo — Home"} className="group justify-self-start focus-visible:outline-offset-8">
          <ParigoLogo className="text-[1.72rem] md:text-[1.95rem]" />
        </Link>

        <div className="hidden items-center justify-center gap-8 md:flex">
          {nav.slice(1, 4).map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={cn("nav-link relative rounded-full px-3 py-2 text-[.7rem] font-semibold uppercase tracking-[.08em] text-[var(--text-muted)]", active && "text-[var(--foreground)] after:absolute after:inset-x-3 after:-bottom-0.5 after:h-px after:bg-[var(--signal)]")}>{item.name}</Link>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-0.5">
          <button type="button" onClick={toggleLocale} className="nav-control hidden w-11 font-mono text-[.64rem] font-semibold tracking-[.12em] sm:inline-flex" aria-label={`${t("common.language")} — ${locale === "fr" ? "English" : "Français"}`} title={locale === "fr" ? "English" : "Français"}>{locale === "fr" ? "EN" : "FR"}</button>
          <button type="button" onClick={toggleTheme} className="nav-control hidden w-11 sm:inline-flex" aria-label={theme === "light" ? t("common.themeDark") : t("common.themeLight")}>{theme === "light" ? <Moon size={16} /> : <Sun size={16} />}</button>
          <Link href="/search" aria-label={t("nav.openSearch")} className="nav-control inline-flex w-11"><Search size={16} /></Link>
          <div className="hidden xl:block [&_button]:min-h-11 [&_button]:whitespace-nowrap [&_button]:rounded-[var(--radius-sm)] [&_button]:border-0 [&_button]:bg-transparent [&_button]:shadow-none"><UserMenu /></div>
          <button type="button" onClick={() => setMenuState({ pathname, open: !open })} aria-expanded={open} aria-controls="global-menu" aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")} className="nav-control inline-flex gap-2 px-2.5 text-[.72rem] font-semibold uppercase tracking-[.08em]">
            <span className="hidden lg:inline">{t("common.menu")}</span>{open ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div id="global-menu" role="dialog" aria-modal="true" aria-label={locale === "fr" ? "Menu principal" : "Main menu"} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .22 }} className="fixed inset-x-3 bottom-3 top-[82px] z-[1] overflow-y-auto rounded-[1.35rem] border border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] px-4 py-10 text-[var(--foreground)] shadow-[0_24px_80px_rgba(15,22,16,.16)] backdrop-blur-2xl md:inset-x-6 md:px-8 md:py-14">
            <div className="mx-auto grid max-w-[1500px] gap-14 md:grid-cols-12">
              <div className="md:col-span-8">
                <p className="eyebrow mb-6 text-[var(--signal-strong)]">{locale === "fr" ? "Navigation" : "Navigation"}</p>
                <div className="border-t border-[var(--line)]">
                  {nav.map((item, index) => (
                    <motion.div key={item.href} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .035 }}>
                      <Link href={item.href} className="group -mx-3 grid grid-cols-[2rem_1fr_auto] items-center gap-3 border-b border-[var(--line)] px-3 py-4 text-[clamp(1.65rem,4vw,3.8rem)] font-semibold leading-none tracking-[-.045em] transition-[background-color,color,padding] duration-300 hover:bg-[var(--surface-soft)] hover:text-[var(--signal-strong)] md:hover:px-6">
                        <span className="font-mono text-[.58rem] font-normal tracking-normal text-[var(--text-muted)]">0{index + 1}</span><span>{item.name}</span><span className="flex h-9 w-9 items-center justify-center rounded-full border border-current text-sm font-normal tracking-normal transition-transform group-hover:translate-x-1 group-hover:-rotate-12">↗</span>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col justify-between gap-10 border-t border-[var(--line)] pt-6 md:col-span-3 md:col-start-10">
                <div className="grid gap-3 text-sm text-[var(--text-muted)]">
                  <Link href="/about" className="hover:text-[var(--foreground)]">{t("common.about")}</Link>
                  <Link href="/contact" className="hover:text-[var(--foreground)]">{t("common.contact")}</Link>
                  <Link href="/legal" className="hover:text-[var(--foreground)]">{t("footer.legalNotice")}</Link>
                  <Link href="/privacy" className="hover:text-[var(--foreground)]">{t("footer.privacy")}</Link>
                </div>
                <div className="flex gap-1 sm:hidden"><button onClick={toggleLocale} className="nav-control inline-flex w-11 font-mono text-[.64rem] font-semibold tracking-[.12em]" aria-label={t("common.language")}>{locale === "fr" ? "EN" : "FR"}</button><button onClick={toggleTheme} className="nav-control inline-flex w-11" aria-label={theme === "light" ? t("common.themeDark") : t("common.themeLight")}>{theme === "light" ? <Moon size={16} /> : <Sun size={16} />}</button><UserMenu /></div>
                <p className="eyebrow text-[var(--text-muted)]">Music for images<br />Paris · France</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
