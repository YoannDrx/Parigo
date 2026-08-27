"use client";

import Link from "next/link";
import type { LinkProps } from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Menu, Moon, Sun, X } from "lucide-react";
import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode, type SetStateAction } from "react";
import { UserMenu } from "@/components/features/UserMenu";
import { useI18n } from "@/components/providers/I18nProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";
import { alternateLocalePath, localizedPath, stripLocalePrefix } from "@/lib/locale";
import { ParigoLogo } from "./ParigoLogo";
import { Tooltip } from "@/components/ui/Tooltip";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { releaseBodyScrollLockBeforeNavigation, useBodyScrollLock } from "@/hooks/use-body-scroll-lock";

interface HeaderProps { variant?: "default" | "overlay"; }

let persistedHeaderMenuOpen = false;

function LanguageLink({ className, children }: { className: string; children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale, t } = useI18n();
  const query = searchParams.toString();
  const href = `${alternateLocalePath(pathname, locale)}${query ? `?${query}` : ""}`;
  return (
    <Link href={href} prefetch={false} hrefLang={locale === "fr" ? "en" : "fr"} className={className} aria-label={`${t("common.language")} — ${locale === "fr" ? "English" : "Français"}`}>
      {children}
    </Link>
  );
}

export function Header({ variant = "default" }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpenState] = useState(() => persistedHeaderMenuOpen);
  const [headerVisible, setHeaderVisible] = useState(true);
  const previousScrollY = useRef(0);
  const previousContentPath = useRef(stripLocalePrefix(pathname));
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  useBodyScrollLock(open);

  const setOpen = useCallback((action: SetStateAction<boolean>) => {
    setOpenState((current) => {
      const next = typeof action === "function" ? action(current) : action;
      persistedHeaderMenuOpen = next;
      return next;
    });
  }, []);

  useEffect(() => {
    const contentPath = stripLocalePrefix(pathname);
    if (contentPath !== previousContentPath.current) setOpen(false);
    previousContentPath.current = contentPath;
  }, [pathname, setOpen]);

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
    if (!open) return;
    const focusable = () => [...(menuRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])];
    const frame = window.requestAnimationFrame(() => focusable()[0]?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.querySelector(".parigo-modal-backdrop")) return;
      if (event.key === "Escape") {
        setOpen(false);
        menuTriggerRef.current?.focus();
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, pathname, setOpen]);

  const navigationItems = {
    search: { name: t("common.search"), href: "/search", note: locale === "fr" ? "Par humeur, instrument ou usage" : "By mood, instrument or use" },
    albums: { name: t("common.albums"), href: "/albums", note: locale === "fr" ? "Explorez tous nos albums" : "Explore all our albums" },
    synchronisations: { name: locale === "fr" ? "Synchronisations" : "Syncs", href: "/synchronisations", note: locale === "fr" ? "Nos musiques à l’image" : "Our music for moving images" },
    playlists: { name: t("common.playlists"), href: "/playlists", note: locale === "fr" ? "Nos sélections éditoriales" : "Our editorial selections" },
    licensing: { name: t("common.licensing"), href: "/licensing", note: locale === "fr" ? "Comprendre et gérer les droits" : "Understand and manage rights" },
    parigoLabel: { name: locale === "fr" ? "Notre label" : "Our label", href: "/notre-label", note: locale === "fr" ? "Le catalogue original Parigo" : "Parigo’s original catalogue" },
    composers: { name: locale === "fr" ? "Talents" : "Talent", href: "/talents", note: locale === "fr" ? "Celles et ceux qui créent" : "The people behind the music" },
    clips: { name: "Clips", href: "/clips", note: locale === "fr" ? "Le catalogue en images" : "The catalogue in motion" },
    labels: { name: "Labels", href: "/labels", note: locale === "fr" ? "Nos catalogues partenaires" : "Our partner catalogues" },
  };
  const primaryNav = [
    navigationItems.search,
    navigationItems.albums,
    navigationItems.synchronisations,
    navigationItems.playlists,
    navigationItems.licensing,
  ];
  const drawerNav = [
    navigationItems.search,
    navigationItems.labels,
    navigationItems.parigoLabel,
    navigationItems.albums,
    navigationItems.synchronisations,
    navigationItems.playlists,
    navigationItems.licensing,
    navigationItems.clips,
    navigationItems.composers,
  ];
  const currentPath = stripLocalePrefix(pathname);
  const hrefFor = (href: string) => localizedPath(locale, href);
  const navigateFromOpenMenu = useCallback((href: string): LinkProps["onNavigate"] => (event) => {
    if (!open) return;
    event.preventDefault();
    releaseBodyScrollLockBeforeNavigation();
    setOpen(false);
    router.push(href);
  }, [open, router, setOpen]);
  const handleLogoClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    if (stripLocalePrefix(pathname) !== "/") {
      setOpen(false);
      return;
    }
    event.preventDefault();
    if (open) releaseBodyScrollLockBeforeNavigation();
    setOpen(false);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "instant" : "smooth" });
  }, [open, pathname, setOpen]);

  return (
    <header
      data-variant={variant}
      data-header-visible={headerVisible || open ? "true" : "false"}
      style={{ top: headerVisible || open ? 0 : -82 }}
      className={cn("fixed inset-x-0 z-[80] w-full text-[var(--foreground)] transition-[top] duration-300 ease-out", open && "h-[100dvh] overflow-hidden")}
    >
      <nav aria-label={locale === "fr" ? "Navigation principale" : "Main navigation"} className="relative z-[2] grid h-[74px] w-full grid-cols-[1fr_auto] items-center border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] px-4 backdrop-blur-xl md:px-8 lg:grid-cols-[190px_minmax(0,1fr)_auto]">
        <Link href={hrefFor("/")} onClick={handleLogoClick} aria-label={locale === "fr" ? "Parigo — Accueil" : "Parigo — Home"} className="group justify-self-start focus-visible:outline-offset-8">
          <ParigoLogo className="text-[1.75rem] md:text-[1.95rem]" />
        </Link>

        <div className="hidden h-full items-stretch justify-self-center gap-7 lg:flex xl:gap-11">
          {primaryNav.map((item) => {
            const active = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={hrefFor(item.href)} aria-current={active ? "page" : undefined} className={cn("nav-link relative flex h-full items-center px-1 text-[.64rem] font-semibold uppercase tracking-[.1em] text-[var(--text-muted)] focus-visible:outline-none", active && "text-[var(--foreground)]")}><span className="nav-link__label">{item.name}</span></Link>
            );
          })}
        </div>

        <div className="flex h-full items-center justify-end gap-1">
          <div className="hidden items-center lg:flex">
            <Tooltip label={locale === "fr" ? "Passer en anglais" : "Switch to French"} side="bottom"><Suspense fallback={<span className="nav-control grid h-11 w-11 place-items-center rounded-full font-mono text-[.64rem] font-semibold tracking-[.12em]">{locale === "fr" ? "EN" : "FR"}</span>}><LanguageLink className="nav-control grid h-11 w-11 place-items-center rounded-full font-mono text-[.64rem] font-semibold tracking-[.12em]">{locale === "fr" ? "EN" : "FR"}</LanguageLink></Suspense></Tooltip>
            <Tooltip label={theme === "light" ? t("common.themeDark") : t("common.themeLight")} side="bottom"><button type="button" onClick={toggleTheme} className="nav-control h-11 w-11 rounded-full" aria-label={theme === "light" ? t("common.themeDark") : t("common.themeLight")}>{theme === "light" ? <Moon size={16} /> : <Sun size={16} />}</button></Tooltip>
          </div>
          <div className="hidden xl:block"><UserMenu compact /></div>
          <Tooltip label={open ? t("nav.closeMenu") : t("nav.openMenu")} side="bottom"><button ref={menuTriggerRef} type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls="global-menu" aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")} className="nav-control h-11 w-11">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button></Tooltip>
        </div>
      </nav>

        {open && (
          <div ref={menuRef} id="global-menu" role="dialog" aria-modal="true" aria-label={locale === "fr" ? "Menu principal" : "Main menu"} className="parigo-drawer parigo-drawer--bottom parigo-global-menu absolute inset-x-0 bottom-0 top-[74px] z-[1] h-[calc(100dvh-74px)] min-h-0 overflow-y-auto overscroll-contain text-[var(--foreground)]">
            <div className="relative mx-auto grid min-h-max max-w-[1760px] gap-x-8 px-4 py-7 md:grid-cols-12 md:px-8 md:py-10 xl:gap-x-12">
              <div className="md:col-span-8 lg:col-span-9">
                <div className="mb-6 flex items-start justify-between gap-4 border-b border-[var(--line)] pb-5 md:block md:pb-6">
                  <SignedTitle as="h2" className="max-w-[11ch] text-[clamp(2.5rem,4.6vw,5rem)] leading-[.88] text-[var(--foreground)]">
                    {locale === "fr" ? "Explorer Parigo." : "Explore Parigo."}
                  </SignedTitle>
                  <div data-testid="mobile-menu-controls" className="flex shrink-0 items-center gap-1 md:hidden">
                    <Suspense fallback={<span className="grid h-10 w-10 place-items-center font-mono text-[.64rem] font-semibold tracking-[.1em] text-[var(--text-muted)]">{locale === "fr" ? "EN" : "FR"}</span>}>
                      <LanguageLink className="nav-control grid h-10 w-10 place-items-center font-mono text-[.64rem] font-semibold tracking-[.1em]">{locale === "fr" ? "EN" : "FR"}</LanguageLink>
                    </Suspense>
                    <button type="button" onClick={toggleTheme} className="nav-control grid h-10 w-10 place-items-center" aria-label={theme === "light" ? t("common.themeDark") : t("common.themeLight")}>
                      {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
                    </button>
                    <UserMenu compact />
                  </div>
                </div>
                <div data-testid="drawer-navigation" className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                  {drawerNav.map((item, index) => {
                    const active = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
                    return (
                      <div key={item.href} style={{ animationDelay: `${index * 28}ms` }} className="animate-[fade-in_.25s_ease-out_both]">
                        <Link
                          href={hrefFor(item.href)}
                          onClick={() => setOpen(false)}
                          onNavigate={navigateFromOpenMenu(hrefFor(item.href))}
                          aria-label={item.name}
                          aria-current={active ? "page" : undefined}
                          data-active={active ? "true" : "false"}
                          className="parigo-menu-card group"
                        >
                          <span className="parigo-menu-card__title">{item.name}</span>
                          <span className="parigo-menu-card__note">{item.note}</span>
                          <span className="parigo-menu-card__arrow" aria-hidden="true"><ArrowUpRight size={15} /></span>
                        </Link>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-8 hidden md:block xl:hidden">
                  <p className="eyebrow mb-4 text-[var(--text-muted)]">{locale === "fr" ? "Votre espace" : "Your space"}</p>
                  <UserMenu embedded />
                </div>
              </div>

              <aside className="parigo-menu-aside mt-8 flex flex-col gap-7 p-5 md:col-span-4 md:mt-0 md:p-6 lg:col-span-3">
                <div className="parigo-menu-aside__intro">
                  <p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Un projet en tête ?" : "A project in mind?"}</p>
                  <p className="mt-3 text-xl font-semibold leading-tight tracking-[-.035em]">
                    {locale === "fr" ? "Parlons musique, images et intentions." : "Let’s talk music, images and intent."}
                  </p>
                  <Link href={hrefFor("/contact")} onClick={() => setOpen(false)} onNavigate={navigateFromOpenMenu(hrefFor("/contact"))} className="parigo-menu-contact group mt-5">
                    <span>{locale === "fr" ? "Nous envoyer un brief" : "Send us a brief"}</span>
                    <ArrowUpRight size={14} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </div>
                <div className="hidden md:block lg:hidden">
                  <p className="eyebrow mb-4 text-[var(--text-muted)]">{locale === "fr" ? "Préférences" : "Preferences"}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Suspense fallback={<span className="flex min-h-14 items-center justify-between border border-[var(--line)] px-4 text-left text-xs font-semibold"><span>{locale === "fr" ? "Langue" : "Language"}</span><span className="font-mono text-[.65rem] text-[var(--signal-strong)]">{locale === "fr" ? "EN" : "FR"}</span></span>}><LanguageLink className="flex min-h-14 items-center justify-between border border-[var(--line)] px-4 text-left text-xs font-semibold transition hover:border-[var(--signal)] hover:bg-[var(--signal-soft)]"><span>{locale === "fr" ? "Langue" : "Language"}</span><span className="font-mono text-[.65rem] text-[var(--signal-strong)]">{locale === "fr" ? "EN" : "FR"}</span></LanguageLink></Suspense>
                    <button onClick={toggleTheme} className="flex min-h-14 items-center justify-between border border-[var(--line)] px-4 text-left text-xs font-semibold transition hover:border-[var(--signal)] hover:bg-[var(--signal-soft)]" aria-label={theme === "light" ? t("common.themeDark") : t("common.themeLight")}><span>{locale === "fr" ? "Thème" : "Theme"}</span>{theme === "light" ? <Moon size={16} /> : <Sun size={16} />}</button>
                  </div>
                </div>

                <div className="mt-auto grid gap-2 border-t border-[var(--line)] pt-5 text-sm text-[var(--text-muted)]">
                  <Link href={hrefFor("/about")} onClick={() => setOpen(false)} className="min-h-9 hover:text-[var(--foreground)]">{t("common.about")}</Link>
                  <Link href={hrefFor("/contact")} onClick={() => setOpen(false)} className="min-h-9 hover:text-[var(--foreground)]">{t("common.contact")}</Link>
                  <Link href={hrefFor("/legal")} onClick={() => setOpen(false)} className="min-h-9 hover:text-[var(--foreground)]">{t("footer.legalNotice")}</Link>
                  <Link href={hrefFor("/privacy")} onClick={() => setOpen(false)} className="min-h-9 hover:text-[var(--foreground)]">{t("footer.privacy")}</Link>
                </div>
              </aside>
            </div>
          </div>
        )}
    </header>
  );
}
