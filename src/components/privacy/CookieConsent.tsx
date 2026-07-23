"use client";

import { ChevronDown, Cookie, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { Switch } from "@/components/ui/Switch";

const STORAGE_KEY = "parigo-cookie-consent";
const CHANGE_EVENT = "parigo:cookie-consent-change";
const OPEN_EVENT = "parigo:open-cookie-preferences";

interface ConsentPreferences {
  necessary: true;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

const defaults = (): ConsentPreferences => ({ necessary: true, preferences: false, analytics: false, marketing: false, updatedAt: "" });

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

function getSnapshot() { return window.localStorage.getItem(STORAGE_KEY) ?? "unset"; }
function getServerSnapshot() { return "loading"; }

function persist(preferences: ConsentPreferences) {
  const value = JSON.stringify({ ...preferences, necessary: true, updatedAt: new Date().toISOString() });
  window.localStorage.setItem(STORAGE_KEY, value);
  document.cookie = `parigo-consent=${encodeURIComponent(value)};path=/;max-age=31536000;samesite=lax`;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function CookieConsent() {
  const { locale } = useI18n();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [preferences, setPreferences] = useState<ConsentPreferences>(defaults);
  const [modalOpen, setModalOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const hasChoice = snapshot !== "unset" && snapshot !== "loading";

  useEffect(() => {
    const openPreferences = () => {
      try { setPreferences(snapshot.startsWith("{") ? JSON.parse(snapshot) : defaults()); } catch { setPreferences(defaults()); }
      setModalOpen(true);
    };
    window.addEventListener(OPEN_EVENT, openPreferences);
    return () => window.removeEventListener(OPEN_EVENT, openPreferences);
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

  const acceptAll = () => { persist({ necessary: true, preferences: true, analytics: true, marketing: true, updatedAt: "" }); setModalOpen(false); };
  const rejectAll = () => { persist(defaults()); setModalOpen(false); };
  const save = () => { persist(preferences); setModalOpen(false); };
  const open = () => {
    try { setPreferences(snapshot.startsWith("{") ? JSON.parse(snapshot) : defaults()); } catch { setPreferences(defaults()); }
    setModalOpen(true);
  };
  const copy = locale === "fr" ? {
    bannerTitle: "Vos choix, sans bruit de fond.", bannerCopy: "Parigo utilise des cookies nécessaires au fonctionnement du site. Les catégories optionnelles ne seront activées qu’avec votre accord.", accept: "Tout accepter", reject: "Tout refuser", customize: "Personnaliser", title: "Préférences de cookies", introTitle: "Utilisation des cookies", intro: "Choisissez les catégories que Parigo peut utiliser. Analytics et Speed Insights restent désactivés tant que vous n’avez pas accepté la mesure d’audience.", save: "Enregistrer mes choix", always: "Toujours actif",
    categories: [
      ["necessary", "Strictement nécessaires", "Navigation, sécurité, langue, thème et mémorisation de vos choix."],
      ["preferences", "Préférences", "Fonctions de confort et personnalisation non essentielles."],
      ["analytics", "Mesure d’audience", "Comprendre l’usage du site à partir de données agrégées."],
      ["marketing", "Médias et marketing", "Contenus tiers, réseaux sociaux et mesure des campagnes."],
    ],
  } : {
    bannerTitle: "Your choices, without the background noise.", bannerCopy: "Parigo uses cookies required for the website to work. Optional categories will only be enabled with your consent.", accept: "Accept all", reject: "Reject all", customize: "Customise", title: "Cookie preferences", introTitle: "How cookies are used", intro: "Choose which categories Parigo may use. Analytics and Speed Insights remain disabled until you accept analytics.", save: "Save my choices", always: "Always active",
    categories: [
      ["necessary", "Strictly necessary", "Navigation, security, language, theme and saving your choices."],
      ["preferences", "Preferences", "Non-essential convenience and personalisation features."],
      ["analytics", "Analytics", "Understand website usage through aggregated data."],
      ["marketing", "Media and marketing", "Third-party media, social networks and campaign measurement."],
    ],
  };

  return (
    <>
      {snapshot === "unset" && !modalOpen && <aside aria-label={copy.title} className="parigo-frame !fixed inset-x-3 bottom-3 z-[120] border border-white/18 bg-[#0c0d0b]/95 p-5 text-[#f3f0e8] shadow-[0_24px_90px_rgba(0,0,0,.45)] backdrop-blur-2xl md:inset-x-auto md:bottom-6 md:left-6 md:max-w-[620px] md:p-7">
        <div className="grid gap-6 md:grid-cols-[auto_1fr]"><span className="grid h-12 w-12 place-items-center bg-[var(--signal)] text-[#10110e]"><Cookie size={20} /></span><div><h2 className="font-[var(--font-editorial)] text-3xl font-normal">{copy.bannerTitle}</h2><p className="mt-3 text-sm leading-relaxed text-white/58">{copy.bannerCopy}</p></div></div>
        <div className="mt-6 flex flex-wrap gap-2"><button type="button" onClick={acceptAll} className="min-h-11 bg-[var(--signal)] px-5 text-sm font-semibold text-[#10110e]">{copy.accept}</button><button type="button" onClick={rejectAll} className="min-h-11 border border-white/22 px-5 text-sm font-semibold">{copy.reject}</button><button type="button" onClick={open} className="min-h-11 border-b border-white/28 px-3 text-sm">{copy.customize}</button></div>
      </aside>}

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
