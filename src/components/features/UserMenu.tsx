"use client";

import { useState, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  User,
  LogOut,
  Heart,
  ListMusic,
  MessageSquareText,
  Clock,
  Download,
  Settings,
  Search,
  Tags,
  ChevronDown,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { useAuthModalStore } from "@/stores/auth-modal-store";
import { useI18n } from "@/components/providers/I18nProvider";
import { cn } from "@/lib/utils";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { AnchoredPopover } from "@/components/ui/AnchoredPopover";

const subscribeToHydration = () => () => undefined;

function AccountMark({ initials, image, large = false }: { initials: string; image?: string | null; large?: boolean }) {
  const dimension = large ? 64 : 40;
  return (
    <span data-testid="account-mark" className={cn("account-mark", large ? "account-mark--large h-16 w-16" : "h-10 w-10")}>
      <span className="account-mark__content">
        {image ? <Image src={image} alt="" width={dimension} height={dimension} className="h-full w-full object-cover" /> : initials}
      </span>
    </span>
  );
}

export function UserMenu({ compact = false, embedded = false, mobileSheet = false, onNavigate, onOpenChange }: { compact?: boolean; embedded?: boolean; mobileSheet?: boolean; onNavigate?: () => void; onOpenChange?: (open: boolean) => void }) {
  const { locale, t } = useI18n();
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isHydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const openLogin = () => {
    useAuthModalStore.getState().openLogin();
  };
  const closeForNavigation = () => {
    setIsOpen(false);
    onOpenChange?.(false);
    onNavigate?.();
  };

  const closePopover = () => {
    setIsOpen(false);
    onOpenChange?.(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      setIsOpen(false);
      onOpenChange?.(false);
      onNavigate?.();
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
        <ParigoLoader size="icon" label={locale === "fr" ? "Chargement du compte" : "Loading account"} />
      </div>
    );
  }

  // Not logged in
  if (!session?.user) {
    if (embedded) return <section aria-label={locale === "fr" ? "Compte" : "Account"}><button type="button" data-testid="embedded-login" className="group inline-flex min-h-11 items-center gap-2.5 bg-transparent text-sm font-semibold text-[var(--foreground)] transition-colors hover:text-[var(--signal-strong)]" aria-label={t("auth.openLogin")} onClick={openLogin}><User size={17} /><span>{t("auth.login")}</span><ArrowUpRight size={14} className="opacity-55 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" /></button></section>;
    const control = (
      <Button
        variant={compact ? "ghost" : "outline"}
        size="sm"
        className={compact ? "nav-control h-11 w-11 rounded-none border-transparent p-0 hover:!bg-transparent" : "gap-2"}
        aria-label={t("auth.openLogin")}
        onClick={openLogin}
      >
        <User size={18} />
        {!compact && <span className="hidden sm:inline">{t("auth.login")}</span>}
      </Button>
    );
    return compact ? <Tooltip label={t("auth.login")} side="bottom">{control}</Tooltip> : control;
  }

  // Logged in - show dropdown
  const user = session.user;
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
    { icon: MessageSquareText, label: t("account.comments"), note: locale === "fr" ? "Vos notes, Track par Track" : "Your notes, track by track", href: "/account/comments" },
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
          <Link href="/account" onClick={closeForNavigation} aria-label={locale === "fr" ? "Ouvrir mon profil" : "Open my profile"} className="group/profile min-w-0 outline-none">
            <p className="eyebrow mb-2 text-[var(--signal-strong)]">{locale === "fr" ? "Espace personnel" : "Personal space"}</p>
            <p className="truncate font-[var(--font-editorial)] text-2xl font-semibold leading-none tracking-[-.045em] transition-colors group-hover/profile:text-[var(--signal-strong)] group-focus-visible/profile:text-[var(--signal-strong)]">{user.name || (locale === "fr" ? "Utilisateur" : "User")}</p>
            <p className="mt-2 truncate text-xs text-[var(--text-muted)]">{user.email}</p>
          </Link>
        </div>
        <div className="grid sm:grid-cols-2">
          {menuItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href} onClick={closeForNavigation} aria-current={active ? "page" : undefined} className={cn("group/item grid min-h-[4.35rem] grid-cols-[1.8rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--line)] px-3 transition-colors hover:bg-[var(--signal-soft)] sm:px-5 sm:odd:border-r", active && "bg-[var(--signal-soft)]")}><item.icon size={16} className={cn("text-[var(--text-muted)] transition-colors group-hover/item:text-[var(--signal-strong)]", active && "text-[var(--signal-strong)]")} /><span className="min-w-0"><span className="block text-sm font-semibold">{item.label}</span><span className="mt-0.5 block truncate text-[.68rem] text-[var(--text-muted)]">{item.note}</span></span><ArrowUpRight size={15} className="opacity-35 transition-transform group-hover/item:-rotate-12 group-hover/item:opacity-100" /></Link>;
          })}
        </div>
        <div className="bg-[var(--surface-soft)] px-3 py-4 sm:px-5"><button onClick={handleSignOut} disabled={isSigningOut} className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-[color-mix(in_srgb,var(--danger)_48%,var(--line))] px-4 text-sm font-semibold text-[color-mix(in_srgb,var(--danger)_82%,var(--foreground))] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50">{isSigningOut ? <ParigoLoader size="icon" label={`${t("auth.logout")}…`} /> : <LogOut size={17} />}<span>{isSigningOut ? `${t("auth.logout")}…` : t("auth.logout")}</span></button></div>
      </section>
    );
  }

  const trigger = (
    <button
      ref={triggerRef}
      data-testid="account-trigger"
      onClick={() => setIsOpen((current) => { const next = !current; onOpenChange?.(next); return next; })}
      aria-label={isOpen ? `${t("common.close")} ${t("common.account")}` : `${t("common.open")} ${t("common.account")}`}
      aria-expanded={isOpen}
      aria-controls={isOpen ? "account-navigation-popover" : undefined}
      className={compact ? "group/account nav-control flex min-h-11 w-11 items-center justify-center bg-transparent p-0" : "group/account flex min-h-12 items-center gap-3 border border-[var(--line)] bg-transparent px-3 transition hover:border-[var(--signal-strong)]"}
    >
      <AccountMark initials={initials} image={user.image} />
      {!compact && <><span className="account-trigger__identity min-w-0 text-left"><span className="block max-w-36 truncate text-xs font-semibold">{user.name || user.email}</span><span className="mt-1 block max-w-36 truncate text-[.62rem] text-[var(--text-muted)]">{user.email}</span></span><ChevronDown size={15} className={cn("hidden opacity-55 transition-transform sm:block", isOpen && "rotate-180")} /></>}
    </button>
  );

  return (
    <div className="relative">
      {compact ? <Tooltip label={locale === "fr" ? "Mon compte" : "My account"} side="bottom">{trigger}</Tooltip> : trigger}

        <AnchoredPopover
          id="account-navigation-popover"
          open={isOpen}
          onClose={closePopover}
          anchorRef={triggerRef}
          label={locale === "fr" ? "Navigation du compte" : "Account navigation"}
          width={368}
          mobileSheet={mobileSheet}
          className="!p-0 origin-top-right animate-[fade-in_.2s_ease-out_both]"
        >
          <div data-testid="account-menu">
            <span aria-hidden="true" className="absolute right-6 top-0 h-[3px] w-20 bg-[var(--signal)]" />
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 px-5 pb-5 pt-6">
              <AccountMark initials={initials} image={user.image} large />
              <Link href="/account" onClick={closeForNavigation} aria-label={locale === "fr" ? "Ouvrir mon profil" : "Open my profile"} className="group/profile min-w-0 outline-none">
                <p className="eyebrow mb-2 text-[var(--signal-strong)]">{locale === "fr" ? "Espace personnel" : "Personal space"}</p>
                <p className="truncate font-[var(--font-editorial)] text-2xl font-semibold leading-none tracking-[-.045em] transition-colors group-hover/profile:text-[var(--signal-strong)] group-focus-visible/profile:text-[var(--signal-strong)]">{user.name || (locale === "fr" ? "Utilisateur" : "User")}</p>
                <p className="mt-2 truncate text-xs text-[var(--text-muted)]">{user.email}</p>
              </Link>
            </div>

            <div className="border-t border-[var(--line)]">
              {menuItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeForNavigation}
                  aria-current={active ? "page" : undefined}
                  className={cn("group/item grid min-h-[4.35rem] grid-cols-[1.8rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--line)] px-5 transition-colors hover:bg-[var(--signal-soft)]", active && "bg-[var(--signal-soft)]")}
                >
                  <item.icon size={16} className={cn("text-[var(--text-muted)] transition-colors group-hover/item:text-[var(--signal-strong)]", active && "text-[var(--signal-strong)]")} />
                  <span className="min-w-0"><span className="block text-sm font-semibold">{item.label}</span><span className="mt-0.5 block truncate text-[.68rem] text-[var(--text-muted)]">{item.note}</span></span>
                  <ArrowUpRight size={15} className="opacity-35 transition-transform group-hover/item:-rotate-12 group-hover/item:opacity-100" />
                </Link>
              );})}

            </div>

            <div className="bg-[var(--surface-soft)] px-4 py-4 sm:px-5">
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                style={{ fontSize: ".7rem", fontWeight: 500, letterSpacing: 0, textTransform: "none" }}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-[color-mix(in_srgb,var(--danger)_48%,var(--line))] px-4 text-sm font-semibold text-[color-mix(in_srgb,var(--danger)_82%,var(--foreground))] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
              >
                {isSigningOut ? (
                  <ParigoLoader size="icon" label={`${t("auth.logout")}…`} />
                ) : (
                  <LogOut size={18} />
                )}
                <span>
                  {isSigningOut ? `${t("auth.logout")}…` : t("auth.logout")}
                </span>
              </button>
            </div>
          </div>
        </AnchoredPopover>
    </div>
  );
}
