"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { I18nProvider } from "./I18nProvider";
import { ThemeProvider } from "./ThemeProvider";
import { CookieConsent } from "@/components/privacy/CookieConsent";
import type { Locale } from "@/i18n/messages";
import { AnalyticsGate } from "./AnalyticsGate";
import { useAuthModalStore } from "@/stores/auth-modal-store";
import { usePlayerStore } from "@/stores/player-store";
import { useShortlistStore } from "@/stores/shortlist-store";
import { ClientErrorMonitor } from "./ClientErrorMonitor";

function GlobalOverlays() {
  const authOpen = useAuthModalStore((state) => state.isOpen);
  const shortlistItems = useShortlistStore((state) => state.items.length);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const [AuthModal, setAuthModal] = useState<ComponentType | null>(null);
  const [ShortlistDrawer, setShortlistDrawer] = useState<ComponentType | null>(null);
  const [MiniPlayer, setMiniPlayer] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (!authOpen || AuthModal) return;
    let active = true;
    void import("@/components/features/AuthModal").then((module) => {
      if (active) setAuthModal(() => module.AuthModal);
    });
    return () => { active = false; };
  }, [AuthModal, authOpen]);

  useEffect(() => {
    if (shortlistItems === 0 || ShortlistDrawer) return;
    let active = true;
    void import("@/components/features/ShortlistDrawer").then((module) => {
      if (active) setShortlistDrawer(() => module.ShortlistDrawer);
    });
    return () => { active = false; };
  }, [ShortlistDrawer, shortlistItems]);

  useEffect(() => {
    if (!currentTrack || MiniPlayer) return;
    let active = true;
    void import("@/components/features/MiniPlayer").then((module) => {
      if (active) setMiniPlayer(() => module.MiniPlayer);
    });
    return () => { active = false; };
  }, [MiniPlayer, currentTrack]);

  return (
    <>
      {currentTrack && MiniPlayer && <MiniPlayer />}
      {authOpen && AuthModal && <AuthModal />}
      {shortlistItems > 0 && ShortlistDrawer && <ShortlistDrawer />}
    </>
  );
}

export function QueryProvider({ children, initialLocale }: { children: ReactNode; initialLocale: Locale }) {
  return (
    <ThemeProvider>
      <I18nProvider initialLocale={initialLocale}>
          {children}
          <GlobalOverlays />
          <CookieConsent />
          <AnalyticsGate />
          <ClientErrorMonitor />
      </I18nProvider>
    </ThemeProvider>
  );
}
