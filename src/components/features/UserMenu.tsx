"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  LogOut,
  Heart,
  ListMusic,
  Clock,
  Download,
  Settings,
  ChevronDown,
  Shield,
  Loader2,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui";
import { useAuthModalStore } from "@/stores/auth-modal-store";
import { useI18n } from "@/components/providers/I18nProvider";

const subscribeToHydration = () => () => undefined;

export function UserMenu() {
  const { locale, t } = useI18n();
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isHydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        aria-label={t("auth.openLogin")}
        onClick={() => useAuthModalStore.getState().openLogin()}
      >
        <User size={18} />
        <span className="hidden sm:inline">{t("auth.login")}</span>
      </Button>
    );
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
    { icon: Heart, label: t("auth.favorites"), href: "/account/favorites" },
    { icon: ListMusic, label: t("common.playlists"), href: "/account/playlists" },
    { icon: Clock, label: t("auth.history"), href: "/account/history" },
    { icon: Download, label: t("auth.downloads"), href: "/account/downloads" },
    { icon: Settings, label: t("auth.settings"), href: "/account/settings" },
  ];

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? `${t("common.close")} ${t("common.account")}` : `${t("common.open")} ${t("common.account")}`}
        aria-expanded={isOpen}
        className="flex min-h-11 items-center gap-2 rounded-full border border-[var(--line)] bg-transparent px-2.5 transition hover:border-[var(--signal)]"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name || "User"}
            width={28}
            height={28}
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--signal)] text-xs font-bold text-[#11120f]">
            {initials}
          </div>
        )}
        <ChevronDown
          size={16}
          className={`hidden text-current opacity-60 transition-transform sm:block ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--theme-shadow)]"
          >
            {/* User Info */}
            <div className="border-b border-[var(--line)] p-4">
              <p className="truncate font-semibold">
                {user.name || (locale === "fr" ? "Utilisateur" : "User")}
              </p>
              <p className="truncate text-sm text-[var(--text-muted)]">
                {user.email}
              </p>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="flex min-h-11 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--surface-soft)]"
                >
                  <item.icon size={18} className="text-[var(--text-muted)]" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}

              {/* Admin Link */}
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="flex min-h-11 items-center gap-3 px-4 py-2.5 text-[var(--color-primary-dark)] transition-colors hover:bg-[var(--signal-soft)]"
                >
                  <Shield size={18} />
                  <span className="text-sm font-medium">{locale === "fr" ? "Administration" : "Admin"}</span>
                </Link>
              )}
            </div>

            {/* Sign Out */}
            <div className="border-t border-[var(--line)] py-2">
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {isSigningOut ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <LogOut size={18} />
                )}
                <span className="text-sm font-medium">
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
