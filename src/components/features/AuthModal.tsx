"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowRight, Loader2, LogIn, UserPlus, X } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import { Button, Input } from "@/components/ui";
import { useAuthModalStore } from "@/stores/auth-modal-store";
import { useI18n } from "@/components/providers/I18nProvider";
import { RegisterForm } from "@/components/features/RegisterForm";
import { ParigoLogo } from "@/components/layout/ParigoLogo";

export function LoginForm({ onRegister, onSuccess, onForgot, headingId = "auth-login-title" }: { onRegister?: () => void; onSuccess?: () => void; onForgot?: () => void; headingId?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message || (locale === "fr" ? "Connexion impossible." : "Could not sign in."));
      } else {
        if (onSuccess) onSuccess();
        else {
          router.push("/");
          router.refresh();
        }
      }
    } catch {
      setError(locale === "fr" ? "Une erreur est survenue lors de la connexion." : "An error occurred while signing in.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="mb-8">
        <p className="eyebrow mb-4 text-[var(--signal-strong)]">{locale === "fr" ? "Compte Parigo" : "Parigo account"}</p>
        <h2 id={headingId} className="text-[clamp(2.65rem,5vw,3.8rem)] font-semibold leading-[.94] tracking-[-.055em]">{t("auth.login")}</h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">{t("auth.loginIntro")}</p>
      </div>
      {error && <div role="alert" className="mb-6 flex items-center gap-3 border border-red-300 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="shrink-0" size={19} />{error}</div>}
      <form onSubmit={submit} className="space-y-5">
        <label htmlFor="login-email" className="block text-sm font-medium">
          <span className="mb-2 block">{t("auth.email")}</span>
          <Input id="login-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isLoading} />
        </label>
        <label htmlFor="login-password" className="block text-sm font-medium">
          <span className="mb-2 block">{t("auth.password")}</span>
          <Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} disabled={isLoading} />
        </label>
        <div className="-mt-1 flex justify-end">
          <button type="button" onClick={() => onForgot ? onForgot() : router.push("/forgot-password")} style={{ fontSize: ".68rem", fontWeight: 500, letterSpacing: 0, textTransform: "none" }} className="group/forgot inline-flex min-h-8 items-center gap-1.5 border-b border-[var(--line)] text-[var(--text-muted)] transition-colors hover:border-[var(--signal-strong)] hover:text-[var(--signal-strong)]">
            {locale === "fr" ? "Mot de passe oublié" : "Forgot password"}<ArrowRight size={11} className="transition-transform group-hover/forgot:translate-x-0.5" />
          </button>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={isLoading}>{isLoading && <Loader2 className="animate-spin" size={18} />}{isLoading ? t("auth.loggingIn") : t("auth.login")}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">{t("auth.noAccount")} <button type="button" onClick={() => onRegister ? onRegister() : router.push("/register")} className="font-medium underline">{t("auth.register")}</button></p>
    </>
  );
}

export function AuthModal() {
  const { locale, t } = useI18n();
  const { isOpen, view, close, setView } = useAuthModalStore();
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const focusable = () => [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])') ?? [])];
    const frame = window.requestAnimationFrame(() => focusable()[0]?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.button type="button" aria-label={t("common.close")} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-md" onClick={close} />
        <motion.div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={view === "login" ? "auth-login-title" : "auth-register-title"} initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 20 }} className="relative h-[min(820px,94dvh)] w-full max-w-[1120px] overflow-hidden rounded-[1.2rem] border border-white/20 bg-[var(--surface)] shadow-[0_34px_120px_rgba(0,0,0,.28)]">
          <button type="button" onClick={close} className="nav-control absolute right-4 top-4 z-30 h-10 w-10 rounded-full border border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_82%,transparent)] backdrop-blur-xl" aria-label={t("common.close")}><X size={20} /></button>

          <div className="grid h-full md:grid-cols-[36%_minmax(0,1fr)]">
            <aside className="relative hidden overflow-hidden bg-[#101411] text-white md:block">
              <AnimatePresence mode="wait">
                <motion.div key={view} initial={{ opacity: 0, scale: 1.035 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .985 }} transition={{ duration: .48, ease: [.22, 1, .36, 1] }} className="absolute inset-0">
                  <Image src={view === "login" ? "/images/parigo-studio.jpg" : "/images/synchros/tokyo-vice-portfolio.jpg"} alt="" fill sizes="420px" className="object-cover" />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,12,9,.18),rgba(8,12,9,.9))]" />
                </motion.div>
              </AnimatePresence>
              <div className="absolute inset-0 z-10 flex flex-col justify-between p-8 lg:p-10">
                <ParigoLogo className="text-[2rem]" />
                <AnimatePresence mode="wait">
                  <motion.div key={view} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: .38, ease: [.22, 1, .36, 1] }}>
                    <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/25 bg-black/20 backdrop-blur-md">{view === "login" ? <LogIn size={22} /> : <UserPlus size={22} />}</span>
                    <p className="eyebrow text-[var(--signal)]">{view === "login" ? "Votre espace Parigo" : "Compte Parigo"}</p>
                    <p className="mt-5 max-w-[9ch] font-[var(--font-editorial)] text-[clamp(2.7rem,4vw,4.5rem)] leading-[.88] tracking-[-.055em]">{view === "login" ? (locale === "fr" ? "Retrouvez vos sélections." : "Find your selections.") : (locale === "fr" ? "Entrez dans le catalogue." : "Enter the catalogue.")}</p>
                    <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/66">{view === "login" ? (locale === "fr" ? "Playlists, favoris, téléchargements et sélections de travail, réunis au même endroit." : "Playlists, favourites, downloads and working selections, all in one place.") : (locale === "fr" ? "Sauvegardez, partagez et téléchargez les titres autorisés pour vos projets." : "Save, share and download authorised tracks for your projects.")}</p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </aside>

            <div className="relative min-h-0 overflow-hidden pt-16">
              <div className="absolute left-5 top-5 z-20 flex w-[min(360px,calc(100%-88px))] border-b border-[var(--line)] sm:left-10">
                <motion.span aria-hidden="true" animate={{ x: view === "login" ? "0%" : "100%" }} transition={{ duration: .32, ease: [.22, 1, .36, 1] }} className="absolute -bottom-px left-0 h-[2px] w-1/2 bg-[var(--signal-strong)]" />
                <button type="button" onClick={() => setView("login")} aria-label={locale === "fr" ? "Afficher la connexion" : "Show sign in"} aria-pressed={view === "login"} className={`relative z-10 min-h-8 flex-1 whitespace-nowrap pb-2 text-left text-[.62rem] font-semibold uppercase tracking-[.07em] transition sm:text-[.66rem] ${view === "login" ? "text-[var(--foreground)]" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}>{t("auth.login")}</button>
                <button type="button" onClick={() => setView("register")} aria-label={locale === "fr" ? "Afficher la création de compte" : "Show account creation"} aria-pressed={view === "register"} className={`relative z-10 min-h-8 flex-1 whitespace-nowrap pb-2 text-left text-[.62rem] font-semibold uppercase tracking-[.07em] transition sm:text-[.66rem] ${view === "register" ? "text-[var(--foreground)]" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}>{t("auth.register")}</button>
              </div>
              <motion.section aria-hidden={view !== "login"} inert={view !== "login" ? true : undefined} animate={{ opacity: view === "login" ? 1 : 0, x: view === "login" ? 0 : -32 }} transition={{ duration: .34, ease: [.22, 1, .36, 1] }} className={`absolute inset-x-0 bottom-0 top-16 overflow-y-auto px-6 py-10 sm:px-10 md:px-12 ${view !== "login" ? "pointer-events-none" : ""}`}>
                <div className="mx-auto flex min-h-full max-w-md items-center"><div className="w-full"><LoginForm headingId="auth-login-title" onRegister={() => setView("register")} onForgot={() => { close(); router.push("/forgot-password"); }} onSuccess={() => { close(); router.refresh(); }} /></div></div>
              </motion.section>
              <motion.section aria-hidden={view !== "register"} inert={view !== "register" ? true : undefined} animate={{ opacity: view === "register" ? 1 : 0, x: view === "register" ? 0 : 32 }} transition={{ duration: .34, ease: [.22, 1, .36, 1] }} className={`absolute inset-x-0 bottom-0 top-16 overflow-y-auto px-5 pb-10 pt-7 sm:px-9 ${view !== "register" ? "pointer-events-none" : ""}`}>
                <RegisterForm embedded headingId="auth-register-title" onLogin={() => setView("login")} onSuccess={(email) => { close(); router.push(`/register/success?email=${encodeURIComponent(email)}`); }} />
              </motion.section>
            </div>
          </div>
        </motion.div>
      </motion.div>}
    </AnimatePresence>
  );
}
