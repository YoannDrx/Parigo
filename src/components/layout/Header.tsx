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
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const open = menuState.pathname === pathname && menuState.open;

  useEffect(() => {
    const onScroll = () => {
      const nextY = Math.max(window.scrollY, 0);
      const delta = nextY - lastScrollY.current;

      if (open || nextY < 72) setHidden(false);
      else if (delta > 7) setHidden(true);
      else if (delta < -7) setHidden(false);

      lastScrollY.current = nextY;
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
    { name: t("common.artists"), href: "/artists" },
    { name: t("common.labels"), href: "/labels" },
    { name: t("common.licensing"), href: "/licensing" },
  ];

  return (
    <header
      className={cn(
        "z-[80] w-full text-[#f2f0e8] transition-transform duration-500 [transition-timing-function:var(--ease-out)]",
        variant === "overlay" ? "fixed inset-x-0 top-0" : "sticky top-0",
        hidden && !open && "-translate-y-[105%]",
      )}
    >
      <nav aria-label={locale === "fr" ? "Navigation principale" : "Main navigation"} className="relative z-[2] mx-auto grid h-[72px] max-w-[1920px] grid-cols-[1fr_auto] items-center border-b border-white/12 bg-[#0d0e0c]/88 px-4 backdrop-blur-2xl md:h-[78px] md:grid-cols-[1fr_auto_1fr] md:px-7">
        <Link href="/" aria-label={locale === "fr" ? "Parigo — Accueil" : "Parigo — Home"} className="group justify-self-start focus-visible:outline-offset-8">
          <ParigoLogo className="text-[1.15rem] md:text-[1.28rem]" />
        </Link>

        <div className="hidden items-center justify-center gap-7 md:flex">
          {nav.slice(0, 3).map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href} className={cn("relative py-2 text-[.76rem] font-medium uppercase tracking-[.08em] text-white/58 transition hover:text-white", active && "text-white after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:bg-[var(--signal)]")}>{item.name}</Link>;
          })}
        </div>

        <div className="flex items-center justify-end gap-1.5">
          <button type="button" onClick={toggleLocale} className="nav-control hidden px-3 font-mono text-[.62rem] uppercase tracking-[.14em] sm:inline-flex" aria-label={t("common.language")}>{locale === "fr" ? "EN" : "FR"}</button>
          <button type="button" onClick={toggleTheme} className="nav-control hidden w-11 sm:inline-flex" aria-label={theme === "light" ? t("common.themeDark") : t("common.themeLight")}>{theme === "light" ? <Moon size={16} /> : <Sun size={16} />}</button>
          <Link href="/search" aria-label={t("nav.openSearch")} className="nav-control inline-flex w-11"><Search size={16} /></Link>
          <div className="hidden sm:block [&_button]:min-h-11 [&_button]:rounded-[1px] [&_button]:border-white/20 [&_button]:bg-transparent [&_button]:text-white [&_button]:shadow-none"><UserMenu /></div>
          <button type="button" onClick={() => setMenuState({ pathname, open: !open })} aria-expanded={open} aria-controls="global-menu" aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")} className="nav-control inline-flex gap-2 px-3.5 text-[.72rem] uppercase tracking-[.1em]">
            <span className="hidden lg:inline">{t("common.menu")}</span>{open ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="global-menu"
            role="dialog"
            aria-modal="true"
            aria-label={locale === "fr" ? "Menu principal" : "Main menu"}
            initial={{ clipPath: "inset(0 0 100% 0)", opacity: 0 }}
            animate={{ clipPath: "inset(0 0 0% 0)", opacity: 1 }}
            exit={{ clipPath: "inset(0 0 100% 0)", opacity: 0 }}
            transition={{ duration: .7, ease: [0.22, 1, 0.36, 1] }}
            className="grain fixed inset-0 z-[1] h-[100dvh] touch-pan-y overflow-y-scroll overscroll-contain bg-[#080906]/82 px-4 pb-24 pt-24 text-[#f2f0e8] backdrop-blur-[28px] [-webkit-overflow-scrolling:touch] md:px-8 md:pt-28"
          >
            <div className="pointer-events-none fixed inset-0 signal-grid opacity-[.07]" />
            <div className="relative mx-auto grid min-h-[calc(100dvh+8rem)] max-w-[1800px] content-start gap-12 pb-24 md:grid-cols-12">
              <div className="md:col-span-9">
                <p className="eyebrow mb-7 text-[var(--signal)]">{locale === "fr" ? "Navigation / Choisir une piste" : "Navigation / Choose a path"}</p>
                {nav.map((item, index) => (
                  <motion.div key={item.href} initial={{ opacity: 0, y: 34 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .13 + index * .045 }}>
                    <Link href={item.href} className="group grid grid-cols-[auto_1fr_auto] items-baseline gap-4 border-b border-white/18 py-2 font-[var(--font-editorial)] text-[clamp(2.8rem,6.4vw,7.4rem)] leading-[.9] tracking-[-.055em] transition hover:pl-3 hover:text-[var(--signal)] focus-visible:pl-3">
                      <span className="font-mono text-[.58rem] tracking-normal text-white/32">0{index + 1}</span><span>{item.name}</span><span className="text-[.68rem] not-italic tracking-normal opacity-0 transition group-hover:opacity-100">↗</span>
                    </Link>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-col gap-10 pt-12 md:col-span-2 md:col-start-11">
                <div className="space-y-5 border-t border-white/18 pt-6 text-sm text-white/62">
                  <div className="flex gap-6"><Link href="/about" className="hover:text-[var(--signal)]">{t("common.about")}</Link><Link href="/contact" className="hover:text-[var(--signal)]">{t("common.contact")}</Link></div>
                  <div className="flex flex-col gap-2"><Link href="/legal" className="hover:text-[var(--signal)]">{t("footer.legalNotice")}</Link><Link href="/privacy" className="hover:text-[var(--signal)]">{t("footer.privacy")}</Link></div>
                  <div className="flex gap-2 sm:hidden"><button onClick={toggleLocale} className="nav-control inline-flex min-w-14 font-mono text-xs" aria-label={t("common.language")}>{locale === "fr" ? "EN" : "FR"}</button><button onClick={toggleTheme} className="nav-control inline-flex w-11" aria-label={theme === "light" ? t("common.themeDark") : t("common.themeLight")}>{theme === "light" ? <Moon size={16} /> : <Sun size={16} />}</button><div className="[&_button]:rounded-[1px] [&_button]:border-white/20 [&_button]:text-white"><UserMenu /></div></div>
                  <p className="eyebrow text-white/32">Music for images<br />Paris · France</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
