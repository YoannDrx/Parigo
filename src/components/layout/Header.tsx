"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Moon, Search, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
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
  const open = menuState.pathname === pathname && menuState.open;

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
    { name: t("common.artists"), href: "/artists" },
    { name: t("common.labels"), href: "/labels" },
    { name: t("common.licensing"), href: "/licensing" },
  ];

  return (
    <header data-variant={variant} className="fixed inset-x-0 top-0 z-[80] w-full text-[var(--foreground)]">
      <nav aria-label={locale === "fr" ? "Navigation principale" : "Main navigation"} className="relative z-[2] mx-auto grid h-[70px] max-w-[1920px] grid-cols-[1fr_auto] items-center border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-xl md:grid-cols-[150px_minmax(0,1fr)_auto] md:px-7">
        <Link href="/" aria-label={locale === "fr" ? "Parigo — Accueil" : "Parigo — Home"} className="group justify-self-start focus-visible:outline-offset-8">
          <ParigoLogo className="text-[1.1rem] md:text-[1.22rem]" />
        </Link>

        <div className="hidden items-center justify-center gap-8 md:flex">
          {nav.slice(0, 4).map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={cn("relative py-2 text-[.73rem] font-semibold uppercase tracking-[.08em] text-[var(--text-muted)] transition-colors hover:text-[var(--foreground)]", active && "text-[var(--foreground)] after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:bg-[var(--signal)]")}>{item.name}</Link>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-0.5">
          <button type="button" onClick={toggleLocale} className="nav-control hidden px-3 font-mono text-[.62rem] uppercase tracking-[.12em] sm:inline-flex" aria-label={t("common.language")}>{locale === "fr" ? "EN" : "FR"}</button>
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
          <motion.div id="global-menu" role="dialog" aria-modal="true" aria-label={locale === "fr" ? "Menu principal" : "Main menu"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .22 }} className="fixed inset-0 top-[70px] z-[1] h-[calc(100dvh-70px)] overflow-y-auto bg-[var(--surface)]/98 px-4 py-10 text-[var(--foreground)] backdrop-blur-xl md:px-8 md:py-14">
            <div className="mx-auto grid max-w-[1500px] gap-14 md:grid-cols-12">
              <div className="md:col-span-8">
                <p className="eyebrow mb-6 text-[var(--signal-strong)]">{locale === "fr" ? "Navigation" : "Navigation"}</p>
                <div className="border-t border-[var(--line)]">
                  {nav.map((item, index) => (
                    <motion.div key={item.href} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .035 }}>
                      <Link href={item.href} className="group grid grid-cols-[2rem_1fr_auto] items-center gap-3 border-b border-[var(--line)] py-4 text-[clamp(1.65rem,4vw,3.8rem)] font-semibold leading-none tracking-[-.045em] transition-colors hover:text-[var(--signal-strong)]">
                        <span className="font-mono text-[.58rem] font-normal tracking-normal text-[var(--text-muted)]">0{index + 1}</span><span>{item.name}</span><span className="text-sm font-normal tracking-normal transition-transform group-hover:translate-x-1">↗</span>
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
                <div className="flex gap-1 sm:hidden"><button onClick={toggleLocale} className="nav-control inline-flex min-w-14 font-mono text-xs" aria-label={t("common.language")}>{locale === "fr" ? "EN" : "FR"}</button><button onClick={toggleTheme} className="nav-control inline-flex w-11" aria-label={theme === "light" ? t("common.themeDark") : t("common.themeLight")}>{theme === "light" ? <Moon size={16} /> : <Sun size={16} />}</button><UserMenu /></div>
                <p className="eyebrow text-[var(--text-muted)]">Music for images<br />Paris · France</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
