"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Clock, Download, Heart, ListMusic, Search, Settings, Tags, User } from "lucide-react";
import { useEffect, useRef } from "react";
import { useI18n } from "@/components/providers/I18nProvider";

export function AccountNavigation() {
  const pathname = usePathname();
  const { locale, t } = useI18n();
  const railRef = useRef<HTMLElement>(null);
  const navItems = [
    { icon: User, label: t("account.profile"), href: "/account" },
    { icon: Heart, label: t("account.favorites"), href: "/account/favorites" },
    { icon: ListMusic, label: t("account.playlists"), href: "/account/playlists" },
    { icon: Search, label: t("account.searches"), href: "/account/searches" },
    { icon: Clock, label: t("account.history"), href: "/account/history" },
    { icon: Download, label: t("account.downloads"), href: "/account/downloads" },
    { icon: Tags, label: t("account.tags"), href: "/account/tags" },
    { icon: Settings, label: t("account.settings"), href: "/account/settings" },
  ];
  const isActive = (href: string) => href === "/account"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    const rail = railRef.current;
    const active = rail?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!rail || !active || rail.scrollWidth <= rail.clientWidth) return;
    const left = active.offsetLeft - (rail.clientWidth - active.offsetWidth) / 2;
    rail.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [pathname]);

  return (
    <aside className="min-w-0 flex-shrink-0 lg:w-72">
      <div className="account-nav-shell parigo-frame border border-[var(--line-strong)] bg-[var(--surface)] lg:sticky lg:top-[var(--sticky-offset)]">
        <p className="account-nav__eyebrow hidden border-b border-[var(--line)] px-5 py-4 font-mono text-[.56rem] uppercase tracking-[.14em] text-[var(--text-muted)] lg:block">
          {locale === "fr" ? "Navigation du compte" : "Account navigation"}
        </p>
        <nav ref={railRef} className="account-nav no-scrollbar flex snap-x snap-mandatory overflow-x-auto p-1.5 lg:block lg:overflow-visible" aria-label={locale === "fr" ? "Navigation du compte" : "Account navigation"}>
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                data-active={active}
                className="account-nav__link relative flex min-h-12 shrink-0 snap-center items-center gap-3 overflow-hidden px-4 py-3 text-[var(--text-muted)] lg:w-full"
              >
                {active && <motion.span layoutId="account-nav-active" className="account-nav__active-surface absolute inset-0" transition={{ duration: .28, ease: [0.22, 1, 0.36, 1] }} />}
                <item.icon className="relative z-[1] shrink-0" size={19} />
                <span className="relative z-[1] whitespace-nowrap font-medium">{item.label}</span>
                <span className="account-nav__angle relative z-[1] ml-auto hidden h-4 w-5 shrink-0 lg:block" aria-hidden="true" />
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
