"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import { LoginForm } from "@/components/features/LoginForm";
import { RegisterForm } from "@/components/features/RegisterForm";
import { ParigoLogo } from "@/components/layout/ParigoLogo";
import { useI18n } from "@/components/providers/I18nProvider";
import { cn } from "@/lib/utils";

export type AuthSwitcherView = "login" | "register";

interface AuthSwitcherProps {
  initialView?: AuthSwitcherView;
  view?: AuthSwitcherView;
  onViewChange?: (view: AuthSwitcherView) => void;
  variant?: "page" | "modal";
  nextPath?: string | null;
  onForgot?: () => void;
  onLoginSuccess?: () => void;
  onRegisterSuccess?: (email: string, verificationEmailSent: boolean) => void;
}

export function AuthSwitcher({
  initialView = "login",
  view,
  onViewChange,
  variant = "page",
  nextPath,
  onForgot,
  onLoginSuccess,
  onRegisterSuccess,
}: AuthSwitcherProps) {
  const { locale, t } = useI18n();
  const [internalView, setInternalView] = useState<AuthSwitcherView>(initialView);
  const activeView = view ?? internalView;
  const [mountedViews, setMountedViews] = useState(() => ({
    login: activeView === "login",
    register: activeView === "register",
  }));
  const isLogin = activeView === "login";

  const selectView = (nextView: AuthSwitcherView) => {
    setMountedViews((current) => current[nextView] ? current : { ...current, [nextView]: true });
    if (view === undefined) setInternalView(nextView);
    onViewChange?.(nextView);
  };

  const hero = isLogin
    ? {
        icon: UserPlus,
        eyebrow: locale === "fr" ? "Nouveau chez Parigo ?" : "New to Parigo?",
        title: locale === "fr" ? "Entrez dans le catalogue." : "Enter the catalogue.",
        text: locale === "fr"
          ? "Créez votre espace pour sauvegarder, partager et télécharger vos sélections de travail."
          : "Create your space to save, share and download your working selections.",
        action: t("auth.register"),
        nextView: "register" as const,
      }
    : {
        icon: LogIn,
        eyebrow: locale === "fr" ? "Déjà membre ?" : "Already a member?",
        title: locale === "fr" ? "Heureux de vous revoir." : "Good to see you again.",
        text: locale === "fr"
          ? "Retrouvez vos playlists, favoris, téléchargements et intuitions créatives au même endroit."
          : "Find your playlists, favourites, downloads and creative ideas in one place.",
        action: t("auth.login"),
        nextView: "login" as const,
      };
  const HeroIcon = hero.icon;
  const isModal = variant === "modal";
  const panelClassName = cn(
    "relative z-[1] w-full bg-[var(--surface)] px-5 py-8 transition-[opacity,transform,visibility] duration-500 motion-reduce:transition-none sm:px-8",
    isModal && "min-h-0 flex-1 overflow-y-auto",
    "md:absolute md:inset-y-0 md:w-1/2 md:overflow-y-auto md:px-10 md:py-12",
  );

  return (
    <section
      data-testid="auth-switcher"
      data-auth-view={activeView}
      className={cn(
        "relative flex w-full flex-col overflow-hidden rounded-[1.5rem] border-[8px] border-[var(--surface)] bg-[var(--surface)] shadow-[0_28px_100px_color-mix(in_srgb,var(--foreground)_12%,transparent)] ring-1 ring-[var(--line)] md:block",
        isModal ? "h-full" : "max-w-[1180px] md:h-[min(760px,calc(100dvh-11rem))] md:min-h-[620px]",
      )}
    >
      <aside
        className={cn(
          "relative z-10 flex min-h-[230px] shrink-0 flex-col overflow-hidden bg-[var(--signal-strong)] p-6 text-[var(--signal-contrast)] transition-transform duration-[650ms] ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none sm:p-8",
          "md:absolute md:inset-y-0 md:left-0 md:min-h-0 md:w-1/2 md:p-12",
          isLogin && "md:translate-x-full",
        )}
      >
        <span aria-hidden="true" className="absolute -right-16 -top-16 h-52 w-52 rounded-full border border-current opacity-15" />
        <span aria-hidden="true" className="absolute bottom-6 left-6 h-16 w-16 border-b-2 border-l-2 border-current opacity-50" />
        <span aria-hidden="true" className="absolute right-6 top-6 h-16 w-16 border-r-2 border-t-2 border-current opacity-50" />
        <ParigoLogo monochrome className="relative z-[1] text-[1.75rem]" />
        <div className="relative z-[1] flex flex-1 items-center justify-center py-6 text-center md:py-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: .36, ease: [.22, 1, .36, 1] }}
              className="mx-auto max-w-md"
            >
              <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full border border-current/35 bg-black/10 backdrop-blur-sm">
                <HeroIcon aria-hidden="true" size={19} />
              </span>
              <p className="font-mono text-[.58rem] uppercase tracking-[.14em] opacity-75">{hero.eyebrow}</p>
              <h2 className="mx-auto mt-4 max-w-[10ch] text-[clamp(2.25rem,4vw,4.4rem)] font-semibold leading-[.9] tracking-[-.055em]">{hero.title}</h2>
              <p className="mx-auto mt-5 max-w-sm text-sm leading-6 opacity-75">{hero.text}</p>
              <button
                type="button"
                onClick={() => selectView(hero.nextView)}
                aria-controls={hero.nextView === "login" ? "auth-login-panel" : "auth-register-panel"}
                aria-label={hero.nextView === "login"
                  ? (locale === "fr" ? "Afficher le formulaire de connexion" : "Show the sign-in form")
                  : (locale === "fr" ? "Afficher le formulaire d’inscription" : "Show the registration form")}
                className="group mx-auto mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-current px-7 text-sm font-semibold transition hover:bg-[var(--signal-contrast)] hover:text-[var(--signal-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--signal-strong)]"
              >
                {hero.action}<ArrowRight aria-hidden="true" size={15} className="transition-transform group-hover:translate-x-1" />
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </aside>

      <section
        id="auth-login-panel"
        aria-hidden={!isLogin}
        inert={!isLogin ? true : undefined}
        className={cn(
          panelClassName,
          "md:left-0",
          isLogin ? "block opacity-100" : "hidden md:block md:invisible md:pointer-events-none md:translate-x-10 md:opacity-0",
        )}
      >
        {mountedViews.login ? (
          <div className="mx-auto flex min-h-full max-w-md items-center">
            <div className="w-full">
              <LoginForm
                headingId="auth-login-title"
                nextPath={nextPath}
                onRegister={() => selectView("register")}
                onForgot={onForgot}
                onSuccess={onLoginSuccess}
              />
            </div>
          </div>
        ) : null}
      </section>

      <section
        id="auth-register-panel"
        aria-hidden={isLogin}
        inert={isLogin ? true : undefined}
        className={cn(
          panelClassName,
          "md:left-1/2",
          !isLogin ? "block opacity-100" : "hidden md:block md:invisible md:pointer-events-none md:-translate-x-10 md:opacity-0",
        )}
      >
        {mountedViews.register ? (
          <div className="mx-auto max-w-2xl">
            <RegisterForm
              embedded
              headingId="auth-register-title"
              onLogin={() => selectView("login")}
              onSuccess={onRegisterSuccess}
            />
          </div>
        ) : null}
      </section>
    </section>
  );
}
