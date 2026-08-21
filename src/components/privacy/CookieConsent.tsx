"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type ComponentType } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import type { CookiePreferencesModalProps } from "@/components/privacy/CookiePreferencesModal";
import {
  CONSENT_COOKIE_NAME,
  CONSENT_CHANGE_EVENT,
  CONSENT_OPEN_EVENT,
  CONSENT_STORAGE_KEY,
  CONSENT_UNSET,
  createDefaultConsentPreferences,
  normalizeConsentSnapshot,
  persistConsentPreferences,
  type ConsentPreferences,
} from "@/lib/consent";

const defaults = createDefaultConsentPreferences;

function subscribe(callback: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, callback);
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, callback);
}

function getSnapshot() {
  const stored = normalizeConsentSnapshot(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  if (stored !== CONSENT_UNSET) return stored;
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${CONSENT_COOKIE_NAME}=`))
    ?.slice(CONSENT_COOKIE_NAME.length + 1);
  return normalizeConsentSnapshot(cookie);
}

export function CookieConsent({ initialSnapshot }: { initialSnapshot: string }) {
  const { locale } = useI18n();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => initialSnapshot);
  const [preferences, setPreferences] = useState<ConsentPreferences>(defaults);
  const [modalOpen, setModalOpen] = useState(false);
  const [PreferencesModal, setPreferencesModal] = useState<ComponentType<CookiePreferencesModalProps> | null>(null);
  const hasChoice = snapshot !== CONSENT_UNSET;
  const closeModal = useCallback(() => setModalOpen(false), []);

  useEffect(() => {
    const openPreferences = () => {
      try { setPreferences(snapshot.startsWith("{") ? JSON.parse(snapshot) : defaults()); } catch { setPreferences(defaults()); }
      setModalOpen(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, openPreferences);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, openPreferences);
  }, [snapshot]);

  useEffect(() => {
    if (!modalOpen || PreferencesModal) return;
    let active = true;
    void import("@/components/privacy/CookiePreferencesModal").then((module) => {
      if (active) setPreferencesModal(() => module.CookiePreferencesModal);
    });
    return () => { active = false; };
  }, [PreferencesModal, modalOpen]);

  const acceptAll = () => {
    persistConsentPreferences({ necessary: true, preferences: true, analytics: true, marketing: true, updatedAt: "" });
    closeModal();
  };
  const rejectAll = () => {
    persistConsentPreferences(defaults());
    closeModal();
  };
  const save = () => {
    persistConsentPreferences(preferences);
    closeModal();
  };

  return PreferencesModal ? (
    <PreferencesModal
      open={modalOpen}
      locale={locale}
      preferences={preferences}
      hasChoice={hasChoice}
      onClose={closeModal}
      onAcceptAll={acceptAll}
      onRejectAll={rejectAll}
      onSave={save}
      onPreferenceChange={(category, checked) => setPreferences((current) => ({ ...current, [category]: checked }))}
    />
  ) : null;
}
