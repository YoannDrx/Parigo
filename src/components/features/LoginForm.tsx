"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useI18n } from "@/components/providers/I18nProvider";

export function LoginForm({ onRegister, onSuccess, onForgot, headingId = "auth-login-title", nextPath }: { onRegister?: () => void; onSuccess?: () => void; onForgot?: () => void; headingId?: string; nextPath?: string | null }) {
  const { locale, t, localizedPath } = useI18n();
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
