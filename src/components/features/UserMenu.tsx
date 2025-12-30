"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
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

export function UserMenu() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
  if (isPending) {
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
        onClick={() => useAuthModalStore.getState().openLogin()}
      >
        <User size={18} />
        <span className="hidden sm:inline">Connexion</span>
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
    { icon: Heart, label: "Mes favoris", href: "/account/favorites" },
    { icon: ListMusic, label: "Mes playlists", href: "/account/playlists" },
    { icon: Clock, label: "Historique", href: "/account/history" },
    { icon: Download, label: "Téléchargements", href: "/account/downloads" },
    { icon: Settings, label: "Paramètres", href: "/account/settings" },
  ];

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-[var(--radius-sm)] border-2 border-[var(--color-black)] bg-white shadow-[2px_2px_0px_var(--color-black)] hover:shadow-[4px_4px_0px_var(--color-black)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
      >
        {user.image ? (
          <img
            src={user.image}
            alt={user.name || "User"}
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <div className="w-7 h-7 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
        )}
        <ChevronDown
          size={16}
          className={`text-[var(--color-gray-600)] transition-transform hidden sm:block ${
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
            className="absolute right-0 mt-2 w-64 bg-white border-2 border-[var(--color-black)] rounded-[var(--radius-md)] shadow-[4px_4px_0px_var(--color-black)] overflow-hidden z-50"
          >
            {/* User Info */}
            <div className="p-4 border-b-2 border-[var(--color-gray-100)]">
              <p className="font-semibold text-[var(--color-black)] truncate">
                {user.name || "Utilisateur"}
              </p>
              <p className="text-sm text-[var(--color-gray-600)] truncate">
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
                  className="flex items-center gap-3 px-4 py-2.5 text-[var(--color-black)] hover:bg-[var(--color-gray-100)] transition-colors"
                >
                  <item.icon size={18} className="text-[var(--color-gray-600)]" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}

              {/* Admin Link */}
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
                >
                  <Shield size={18} />
                  <span className="text-sm font-medium">Administration</span>
                </Link>
              )}
            </div>

            {/* Sign Out */}
            <div className="py-2 border-t-2 border-[var(--color-gray-100)]">
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
                  {isSigningOut ? "Déconnexion..." : "Se déconnecter"}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
