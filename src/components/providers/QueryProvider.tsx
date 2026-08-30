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
import { ShowreelAudioProvider } from "./ShowreelAudioProvider";
import { PlaybackCoordinatorProvider, usePlaybackCoordinator } from "./PlaybackCoordinatorProvider";
import { ClipPlaybackProvider } from "./ClipPlaybackProvider";
import { NavigationHistoryProvider } from "@/components/navigation/ContextualBackLink";
import type { Theme } from "./ThemeProvider";
import { ReactQueryProvider } from "./ReactQueryProvider";
import { useTrackShareStore } from "@/stores/track-share-store";

function GlobalOverlays() {
  const authOpen = useAuthModalStore((state) => state.isOpen);
  const shortlistItems = useShortlistStore((state) => state.items.length);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const shareOpen = useTrackShareStore((state) => Boolean(state.target));
  const { foregroundPlayback } = usePlaybackCoordinator();
  const [AuthModal, setAuthModal] = useState<ComponentType | null>(null);
  const [ShortlistDrawer, setShortlistDrawer] = useState<ComponentType | null>(null);
  const [MiniPlayer, setMiniPlayer] = useState<ComponentType | null>(null);
  const [TrackShareDialog, setTrackShareDialog] = useState<ComponentType | null>(null);
  const [ToastViewport, setToastViewport] = useState<ComponentType | null>(null);

  useEffect(() => {
    void import("@/components/ui/ToastViewport").then(({ ToastViewport }) => setToastViewport(() => ToastViewport));
  }, []);
  useEffect(() => {
    if (!authOpen || AuthModal) return;
    void import("@/components/features/AuthModal").then(({ AuthModal }) => setAuthModal(() => AuthModal));
  }, [AuthModal, authOpen]);

  useEffect(() => {
    if (shortlistItems === 0 || ShortlistDrawer) return;
    void import("@/components/features/ShortlistDrawer").then(({ ShortlistDrawer }) => setShortlistDrawer(() => ShortlistDrawer));
  }, [ShortlistDrawer, shortlistItems]);

  useEffect(() => {
    if (!currentTrack || MiniPlayer) return;
    void import("@/components/features/MiniPlayer").then(({ MiniPlayer }) => setMiniPlayer(() => MiniPlayer));
  }, [MiniPlayer, currentTrack]);

  useEffect(() => {
    if (!shareOpen || TrackShareDialog) return;
    void import("@/components/features/TrackShareDialog").then(({ TrackShareDialog }) => setTrackShareDialog(() => TrackShareDialog));
  }, [TrackShareDialog, shareOpen]);

  return (
    <>
      {currentTrack && MiniPlayer && foregroundPlayback !== "clip" && foregroundPlayback !== "showreel" && <MiniPlayer />}
      {AuthModal && <AuthModal />}
      {ShortlistDrawer && <ShortlistDrawer />}
      {TrackShareDialog && <TrackShareDialog />}
      {ToastViewport && <ToastViewport />}
    </>
  );
}

export function QueryProvider({ children, initialLocale, initialConsentSnapshot, initialTheme }: { children: ReactNode; initialLocale: Locale; initialConsentSnapshot: string; initialTheme: Theme }) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <ReactQueryProvider>
        <I18nProvider initialLocale={initialLocale}>
          <NavigationHistoryProvider>
            <PlaybackCoordinatorProvider>
              <ClipPlaybackProvider initialConsentSnapshot={initialConsentSnapshot}>
                <ShowreelAudioProvider>
                  {children}
                  <GlobalOverlays />
                </ShowreelAudioProvider>
              </ClipPlaybackProvider>
              <CookieConsent initialSnapshot={initialConsentSnapshot} />
            </PlaybackCoordinatorProvider>
          </NavigationHistoryProvider>
          <AnalyticsGate />
          <ClientErrorMonitor />
        </I18nProvider>
      </ReactQueryProvider>
    </ThemeProvider>
  );
}
