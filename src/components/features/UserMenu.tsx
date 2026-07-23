"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  User,
  LogOut,
  Heart,
  ListMusic,
  Clock,
  Download,
  Settings,
  Search,
  Tags,
  ChevronDown,
  Shield,
  Loader2,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { Button, Tooltip } from "@/components/ui";
import { useAuthModalStore } from "@/stores/auth-modal-store";
import { useI18n } from "@/components/providers/I18nProvider";
import { cn } from "@/lib/utils";

const subscribeToHydration = () => () => undefined;

function AccountMark({ initials, image, large = false }: { initials: string; image?: string | null; large?: boolean }) {
  const dimension = large ? 48 : 40;
  return (
    <span data-testid="account-mark" className={cn("account-mark", large ? "h-12 w-12" : "h-10 w-10")}>
      <span aria-hidden="true" className="account-mark__corner account-mark__corner--top" />
      <span aria-hidden="true" className="account-mark__corner account-mark__corner--bottom" />
      <span className="account-mark__content">
        {image ? <Image src={image} alt="" width={dimension} height={dimension} className="h-full w-full object-cover" /> : initials}
      </span>
    </span>
  );
}

export function UserMenu({ compact = false, embedded = false }: { compact?: boolean; embedded?: boolean }) {
  const { locale, t } = useI18n();
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isHydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      setIsOpen(false);
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  // Loading state
  if (!isHydrated || isPending) {
    return (
      <div className="w-8 h-8 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--color-gray-400)]" />
      </div>
    );
  }

  // Not logged in
  if (!session?.user) {
    if (embedded) return <section aria-label={locale === "fr" ? "Compte" : "Account"} className="border-y border-[var(--line-strong)] bg-[var(--surface)] px-3 py-5 sm:px-5"><p className="eyebrow mb-4 text-[var(--text-muted)]">{locale === "fr" ? "Compte" : "Account"}</p><Button variant="outline" className="w-full gap-2" aria-label={t("auth.openLogin")} onClick={() => useAuthModalStore.getState().openLogin()}><User size={18} />{t("auth.login")}</Button></section>;
    const control = (
      <Button
        variant={compact ? "ghost" : "outline"}
        size="sm"
        className={compact ? "nav-control h-11 w-11 rounded-none border-transparent p-0 hover:!bg-transparent" : "gap-2"}
        aria-label={t("auth.openLogin")}
        onClick={() => useAuthModalStore.getState().openLogin()}
      >
        <User size={18} />
        {!compact && <span className="hidden sm:inline">{t("auth.login")}</span>}
      </Button>
    );
    return compact ? <Tooltip label={t("auth.login")} side="bottom">{control}</Tooltip> : control;
  }

  // Logged in - show dropdown
  const user = session.user;
  const isAdmin = (user as { role?: string }).role === "ADMIN";
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.charAt(0).toUpperCase() || "U";

  const menuItems = [
    { icon: Heart, label: t("auth.favorites"), note: locale === "fr" ? "Vos titres repérés" : "Tracks you saved", href: "/account/favorites" },
    { icon: ListMusic, label: t("common.playlists"), note: locale === "fr" ? "Vos récits musicaux" : "Your musical stories", href: "/account/playlists" },
    { icon: Search, label: t("account.searches"), note: locale === "fr" ? "Vos intentions à retrouver" : "Searches to revisit", href: "/account/searches" },
    { icon: Tags, label: t("account.tags"), note: locale === "fr" ? "Votre vocabulaire de travail" : "Your working vocabulary", href: "/account/tags" },
    { icon: Clock, label: t("auth.history"), note: locale === "fr" ? "Le fil de vos écoutes" : "Your listening trail", href: "/account/history" },
    { icon: Download, label: t("auth.downloads"), note: locale === "fr" ? "Les fichiers préparés" : "Prepared files", href: "/account/downloads" },
    { icon: Settings, label: t("auth.settings"), note: locale === "fr" ? "Compte et préférences" : "Account and preferences", href: "/account/settings" },
  ];

  if (embedded) {
    return (
      <section data-testid="account-menu" aria-label={locale === "fr" ? "Navigation du compte" : "Account navigation"} className="border-y border-[var(--line-strong)] bg-[var(--surface)] text-[var(--foreground)]">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 border-b border-[var(--line)] px-3 py-5 sm:px-5">
          <AccountMark initials={initials} image={user.image} large />
          <div className="min-w-0"><p className="eyebrow mb-2 text-[var(--signal-strong)]">{locale === "fr" ? "Espace personnel" : "Personal space"}</p><p className="truncate font-[var(--font-editorial)] text-2xl font-semibold leading-none tracking-[-.045em]">{user.name || (locale === "fr" ? "Utilisateur" : "User")}</p><p className="mt-2 truncate text-xs text-[var(--text-muted)]">{user.email}</p></div>
        </div>
        <div className="grid sm:grid-cols-2">
          {menuItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("group/item grid min-h-[4.35rem] grid-cols-[1.8rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--line)] px-3 transition-colors hover:bg-[var(--signal-soft)] sm:px-5 sm:odd:border-r", active && "bg-[var(--signal-soft)]")}><item.icon size={16} className={cn("text-[var(--text-muted)] transition-colors group-hover/item:text-[var(--signal-strong)]", active && "text-[var(--signal-strong)]")} /><span className="min-w-0"><span className="block text-sm font-semibold">{item.label}</span><span className="mt-0.5 block truncate text-[.68rem] text-[var(--text-muted)]">{item.note}</span></span><ArrowUpRight size={15} className="opacity-35 transition-transform group-hover/item:-rotate-12 group-hover/item:opacity-100" /></Link>;
          })}
        </div>
        <div className="flex items-center justify-between gap-4 bg-[var(--surface-soft)] px-3 py-4 sm:px-5"><p className="text-[.67rem] leading-5 text-[var(--text-muted)]">{locale === "fr" ? "Votre catalogue, gardé à portée de main." : "Your catalogue, kept close at hand."}</p><button onClick={handleSignOut} disabled={isSigningOut} style={{ fontSize: ".7rem", fontWeight: 500, letterSpacing: 0, textTransform: "none" }} className="inline-flex min-h-9 shrink-0 items-center gap-2 border-b border-[color-mix(in_srgb,var(--danger)_38%,transparent)] text-[color-mix(in_srgb,var(--danger)_82%,var(--foreground))] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50">{isSigningOut ? <Loader2 size={17} className="animate-spin" /> : <LogOut size={17} />}<span>{isSigningOut ? `${t("auth.logout")}…` : t("auth.logout")}</span></button></div>
      </section>
    );
  }

  const trigger = (
    <button
      data-testid="account-trigger"
      onClick={() => setIsOpen(!isOpen)}
      aria-label={isOpen ? `${t("common.close")} ${t("common.account")}` : `${t("common.open")} ${t("common.account")}`}
      aria-expanded={isOpen}
      className={compact ? "group/account nav-control flex min-h-11 w-11 items-center justify-center bg-transparent p-0" : "group/account flex min-h-12 items-center gap-3 border border-[var(--line)] bg-transparent px-3 transition hover:border-[var(--signal-strong)]"}
    >
      <AccountMark initials={initials} image={user.image} />
      {!compact && <><span className="account-trigger__identity min-w-0 text-left"><span className="block max-w-36 truncate text-xs font-semibold">{user.name || user.email}</span><span className="mt-1 block max-w-36 truncate text-[.62rem] text-[var(--text-muted)]">{user.email}</span></span><ChevronDown size={15} className={cn("hidden opacity-55 transition-transform sm:block", isOpen && "rotate-180")} /></>}
    </button>
  );

  return (
    <div ref={menuRef} className="relative">
      {compact ? <Tooltip label={locale === "fr" ? "Mon compte" : "My account"} side="bottom">{trigger}</Tooltip> : trigger}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            data-testid="account-menu"
            role="dialog"
            aria-label={locale === "fr" ? "Navigation du compte" : "Account navigation"}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 z-50 mt-3 w-[min(23rem,calc(100vw-2rem))] overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-lg)]"
          >
            <span aria-hidden="true" className="absolute right-6 top-0 h-[3px] w-20 bg-[var(--signal)]" />
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 px-5 pb-5 pt-6">
              <AccountMark initials={initials} image={user.image} large />
              <div className="min-w-0">
                <p className="eyebrow mb-2 text-[var(--signal-strong)]">{locale === "fr" ? "Espace personnel" : "Personal space"}</p>
                <p className="truncate font-[var(--font-editorial)] text-2xl font-semibold leading-none tracking-[-.045em]">{user.name || (locale === "fr" ? "Utilisateur" : "User")}</p>
                <p className="mt-2 truncate text-xs text-[var(--text-muted)]">{user.email}</p>
              </div>
            </div>

            <div className="border-t border-[var(--line)]">
              {menuItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn("group/item grid min-h-[4.35rem] grid-cols-[1.8rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--line)] px-5 transition-colors hover:bg-[var(--signal-soft)]", active && "bg-[var(--signal-soft)]")}
                >
                  <item.icon size={16} className={cn("text-[var(--text-muted)] transition-colors group-hover/item:text-[var(--signal-strong)]", active && "text-[var(--signal-strong)]")} />
                  <span className="min-w-0"><span className="block text-sm font-semibold">{item.label}</span><span className="mt-0.5 block truncate text-[.68rem] text-[var(--text-muted)]">{item.note}</span></span>
                  <ArrowUpRight size={15} className="opacity-35 transition-transform group-hover/item:-rotate-12 group-hover/item:opacity-100" />
                </Link>
              );})}

              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="flex min-h-12 items-center gap-3 border-b border-[var(--line)] px-5 text-[var(--signal-strong)] transition-colors hover:bg-[var(--signal-soft)]"
                >
                  <Shield size={18} />
                  <span className="text-sm font-medium">{locale === "fr" ? "Administration" : "Admin"}</span>
                </Link>
              )}
            </div>

            <div className="grid grid-cols-[1fr_auto] items-center gap-4 bg-[var(--surface-soft)] px-5 py-4">
              <p className="text-[.67rem] leading-5 text-[var(--text-muted)]">{locale === "fr" ? "Votre catalogue, gardé à portée de main." : "Your catalogue, kept close at hand."}</p>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                style={{ fontSize: ".7rem", fontWeight: 500, letterSpacing: 0, textTransform: "none" }}
                className="inline-flex min-h-9 items-center gap-2 border-b border-[color-mix(in_srgb,var(--danger)_38%,transparent)] text-[color-mix(in_srgb,var(--danger)_82%,var(--foreground))] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
              >
                {isSigningOut ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <LogOut size={18} />
                )}
                <span>
                  {isSigningOut ? `${t("auth.logout")}…` : t("auth.logout")}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
