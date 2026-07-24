"use client";

import { ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { Switch } from "@/components/ui/Switch";
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
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const hasChoice = snapshot !== CONSENT_UNSET;

  useEffect(() => {
    const openPreferences = () => {
      try { setPreferences(snapshot.startsWith("{") ? JSON.parse(snapshot) : defaults()); } catch { setPreferences(defaults()); }
      setModalOpen(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, openPreferences);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, openPreferences);
  }, [snapshot]);

  useEffect(() => {
    if (!modalOpen) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && hasChoice) setModalOpen(false);
      if (event.key !== "Tab") return;
      const dialog = closeRef.current?.closest<HTMLElement>('[role="dialog"]');
      const focusable = [...(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])') || [])];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [hasChoice, modalOpen]);

  const acceptAll = () => { persistConsentPreferences({ necessary: true, preferences: true, analytics: true, marketing: true, updatedAt: "" }); setModalOpen(false); };
  const rejectAll = () => { persistConsentPreferences(defaults()); setModalOpen(false); };
  const save = () => { persistConsentPreferences(preferences); setModalOpen(false); };
  const copy = locale === "fr" ? {
    accept: "Tout accepter", reject: "Tout refuser", customize: "Personnaliser", title: "Préférences de cookies", introTitle: "Utilisation des cookies", intro: "Choisissez les catégories que Parigo peut utiliser. Analytics et Speed Insights restent désactivés tant que vous n’avez pas accepté la mesure d’audience.", save: "Enregistrer mes choix", always: "Toujours actif",
    categories: [
      ["necessary", "Strictement nécessaires", "Navigation, sécurité, langue, thème et mémorisation de vos choix."],
      ["preferences", "Préférences", "Fonctions de confort et personnalisation non essentielles."],
      ["analytics", "Mesure d’audience", "Comprendre l’usage du site à partir de données agrégées."],
      ["marketing", "Médias et marketing", "Contenus tiers, réseaux sociaux et mesure des campagnes."],
    ],
  } : {
    accept: "Accept all", reject: "Reject all", customize: "Customise", title: "Cookie preferences", introTitle: "How cookies are used", intro: "Choose which categories Parigo may use. Analytics and Speed Insights remain disabled until you accept analytics.", save: "Save my choices", always: "Always active",
    categories: [
      ["necessary", "Strictly necessary", "Navigation, security, language, theme and saving your choices."],
      ["preferences", "Preferences", "Non-essential convenience and personalisation features."],
      ["analytics", "Analytics", "Understand website usage through aggregated data."],
      ["marketing", "Media and marketing", "Third-party media, social networks and campaign measurement."],
    ],
  };

  return (
    <>
      {modalOpen && <div className="fixed inset-0 z-[130] grid place-items-center overflow-y-auto bg-black/68 p-3 backdrop-blur-sm md:p-8" onMouseDown={(event) => { if (event.target === event.currentTarget && hasChoice) setModalOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="cookie-title" className="parigo-modal my-auto w-full max-w-3xl overflow-hidden border border-white/16 bg-[var(--background)] text-[var(--foreground)]">
          <header className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 md:px-7"><div><p className="eyebrow text-[var(--color-primary-dark)]">Parigo / {locale === "fr" ? "Confidentialité" : "Privacy"}</p><h2 id="cookie-title" className="mt-1 font-[var(--font-editorial)] text-3xl font-normal">{copy.title}</h2></div>{hasChoice && <button ref={closeRef} type="button" onClick={() => setModalOpen(false)} className="grid h-11 w-11 place-items-center bg-[var(--surface-soft)]" aria-label={locale === "fr" ? "Fermer" : "Close"}><X size={18} /></button>}</header>
          <div className="max-h-[62dvh] overflow-y-auto px-5 py-6 md:px-7"><h3 className="font-semibold">{copy.introTitle}</h3><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">{copy.intro}</p><div className="mt-6 space-y-2">{copy.categories.map(([key, label, description]) => {
            const category = key as keyof Pick<ConsentPreferences, "necessary" | "preferences" | "analytics" | "marketing">;
            const necessary = category === "necessary";
            const checked = necessary || preferences[category];
            return <div key={key} className="parigo-choice grid grid-cols-[1fr_auto] gap-4 border border-[var(--line)] bg-[var(--surface-soft)] p-4 md:p-5"><div><div className="flex items-center gap-2"><ChevronDown size={15} className="opacity-35" /><h4 className="font-semibold">{label}</h4></div><p className="mt-2 pl-6 text-xs leading-relaxed text-[var(--text-muted)]">{description}</p></div>{necessary ? <span className="self-start font-mono text-[.62rem] uppercase opacity-48">{copy.always}</span> : <Switch checked={checked} label={label} onCheckedChange={(next) => setPreferences((current) => ({ ...current, [category]: next }))} className="origin-top-right scale-[.82]" />}</div>;
          })}</div></div>
          <footer className="flex flex-wrap gap-2 border-t border-[var(--line)] p-4 md:px-7"><button type="button" onClick={acceptAll} className="min-h-11 bg-[var(--foreground)] px-5 text-sm font-semibold text-[var(--background)]">{copy.accept}</button><button type="button" onClick={rejectAll} className="min-h-11 border border-[var(--line-strong)] px-5 text-sm font-semibold">{copy.reject}</button><button type="button" onClick={save} className="min-h-11 bg-[var(--signal)] px-5 text-sm font-semibold text-[#10110e] md:ml-auto">{copy.save}</button></footer>
        </section>
      </div>}
    </>
  );
}
