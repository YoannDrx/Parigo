"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { signIn } from "@/lib/auth-client";
import { loginErrorMessageKey } from "@/lib/auth-errors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useI18n } from "@/components/providers/I18nProvider";

export function LoginForm({ onRegister, onSuccess, onForgot, headingId = "auth-login-title", nextPath }: { onRegister?: () => void; onSuccess?: () => void; onForgot?: () => void; headingId?: string; nextPath?: string | null }) {
  const { locale, t, localizedPath } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(locale === "fr" ? "Veuillez saisir une adresse e-mail valide." : "Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError(locale === "fr" ? "Veuillez saisir votre mot de passe (8 caractères minimum)." : "Please enter your password (at least 8 characters).");
      return;
    }
    setIsLoading(true);
    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        setError(t(loginErrorMessageKey(result.error)));
      } else {
        if (onSuccess) onSuccess();
        else {
          router.push(nextPath || localizedPath("/"));
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
      {error && <div role="alert" className="contact-consent-error mb-6 !block"><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 shrink-0 text-[var(--danger)]" size={19} /><p className="leading-6">{error}</p></div></div>}
      <form onSubmit={submit} noValidate className="space-y-5">
        <label htmlFor="login-email" className="block text-sm font-medium">
          <span className="mb-2 block">{t("auth.email")}</span>
          <Input id="login-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isLoading} />
        </label>
        <div>
          <label htmlFor="login-password" className="mb-2 block text-sm font-medium">{t("auth.password")}</label>
          <div className="relative">
            <Input id="login-password" type={isPasswordVisible ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} disabled={isLoading} className="pr-12" />
            <button
              type="button"
              aria-label={t(isPasswordVisible ? "auth.hidePassword" : "auth.showPassword")}
              aria-controls="login-password"
              aria-pressed={isPasswordVisible}
              disabled={isLoading}
              onClick={() => setIsPasswordVisible((visible) => !visible)}
              className="absolute right-1 top-1/2 inline-flex min-h-10 min-w-10 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPasswordVisible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
            </button>
          </div>
        </div>
        <div className="-mt-1 flex justify-end">
          <button type="button" onClick={() => onForgot ? onForgot() : router.push("/forgot-password")} style={{ fontSize: ".68rem", fontWeight: 500, letterSpacing: 0, textTransform: "none" }} className="group/forgot inline-flex min-h-8 items-center gap-1.5 border-b border-[var(--line)] text-[var(--text-muted)] transition-colors hover:border-[var(--signal-strong)] hover:text-[var(--signal-strong)]">
            {locale === "fr" ? "Mot de passe oublié" : "Forgot password"}<ArrowRight size={11} className="transition-transform group-hover/forgot:translate-x-0.5" />
          </button>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={isLoading}>{isLoading ? <ParigoLoader size="icon" label={t("auth.loggingIn")} /> : null}{isLoading ? t("auth.loggingIn") : t("auth.login")}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">{t("auth.noAccount")} <button type="button" onClick={() => onRegister ? onRegister() : router.push("/register")} className="font-medium underline">{t("auth.register")}</button></p>
    </>
  );
}
