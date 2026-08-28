"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, KeyRound, TriangleAlert } from "lucide-react";
import { PasswordCreationField } from "@/components/features/PasswordCreationField";
import { PasswordRecoveryCard } from "@/components/features/PasswordRecoveryCard";
import { useI18n } from "@/components/providers/I18nProvider";
import { Button } from "@/components/ui/Button";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { meetsPasswordPolicy } from "@/lib/password-strength";

type ResetMode = "reset" | "change";
type Validity = "checking" | "valid" | "invalid";

const primaryLinkClass = "inline-flex min-h-12 items-center justify-center border border-[var(--signal-strong)] bg-[var(--signal-strong)] px-6 py-3 text-center text-sm font-semibold !text-[#102014] transition-colors hover:border-[var(--foreground)] hover:bg-[var(--foreground)] hover:!text-[var(--background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-strong)] focus-visible:ring-offset-2";
const secondaryLinkClass = "inline-flex min-h-11 items-center justify-center border-b border-[var(--line-strong)] px-1 text-sm font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--signal-strong)] hover:text-[var(--signal-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-strong)]";

export function ResetPasswordExperience({ initialToken, mode = "reset" }: { initialToken?: string; mode?: ResetMode }) {
  const { locale, localizedPath } = useI18n();
  const searchToken = useSearchParams().get("token") || "";
  const token = initialToken ?? searchToken;
  const [validity, setValidity] = useState<Validity>(token ? "checking" : "invalid");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    void fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`, { cache: "no-store", signal: controller.signal })
      .then((response) => setValidity(response.ok ? "valid" : "invalid"))
      .catch((fetchError: unknown) => {
        if (!(fetchError instanceof DOMException && fetchError.name === "AbortError")) setValidity("invalid");
      });
    return () => controller.abort();
  }, [token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (validity !== "valid" || !meetsPasswordPolicy(password) || password !== confirmation) {
      setError(locale === "fr"
        ? "Vérifiez la robustesse du mot de passe et assurez-vous que les deux champs correspondent."
        : "Check the password strength and make sure both fields match.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (response.ok) setDone(true);
      else {
        setValidity("invalid");
        setError(locale === "fr" ? "Ce lien est invalide ou expiré." : "This link is invalid or expired.");
      }
    } catch {
      setError(locale === "fr" ? "Le service est momentanément indisponible. Réessayez dans quelques instants." : "The service is temporarily unavailable. Try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  const isChange = mode === "change";
  const title = locale === "fr"
    ? isChange ? "Changer votre mot de passe" : "Créer un nouveau mot de passe"
    : isChange ? "Change your password" : "Create a new password";

  return (
    <PasswordRecoveryCard
      activeStep={validity === "valid" ? 2 : 1}
      eyebrow={locale === "fr" ? (isChange ? "Sécurité du compte" : "Lien de réinitialisation") : (isChange ? "Account security" : "Reset link")}
      icon={KeyRound}
      intro={locale === "fr" ? "Choisissez un mot de passe unique pour sécuriser votre espace, vos sélections et vos téléchargements." : "Choose a unique password to secure your workspace, selections and downloads."}
      title={title}
      footer={<p>{locale === "fr" ? "Vous n’avez pas demandé ce changement ? " : "Didn’t request this change? "}<Link href={localizedPath("/contact")} className="font-medium underline underline-offset-4">{locale === "fr" ? "Contactez Parigo" : "Contact Parigo"}</Link></p>}
    >
      {validity === "checking" ? (
        <div className="flex min-h-40 items-center gap-4 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-soft)] p-5" role="status" aria-live="polite">
          <ParigoLoader size="compact" label={locale === "fr" ? "Validation du lien Parigo" : "Validating the Parigo link"} />
          <div><p className="font-semibold">{locale === "fr" ? "Vérification du lien sécurisé" : "Checking your secure link"}</p><p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{locale === "fr" ? "Cela ne prend que quelques secondes." : "This should only take a few seconds."}</p></div>
        </div>
      ) : validity === "invalid" ? (
        <div role="alert" className="rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--danger)_45%,var(--line))] bg-[color-mix(in_srgb,var(--danger)_7%,var(--surface))] p-5 sm:p-6">
          <TriangleAlert aria-hidden="true" className="text-[var(--danger)]" size={24} />
          <h2 className="mt-4 text-xl font-semibold">{locale === "fr" ? "Ce lien n’est plus valide" : "This link is no longer valid"}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{locale === "fr" ? "Il a peut-être expiré ou déjà été utilisé. Demandez un nouveau lien pour reprendre en toute sécurité." : "It may have expired or already been used. Request a new link to continue securely."}</p>
          {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row"><Link href={localizedPath("/forgot-password")} className={primaryLinkClass}>{locale === "fr" ? "Demander un nouveau lien" : "Request a new link"}</Link><Link href={localizedPath("/login")} className={secondaryLinkClass}>{locale === "fr" ? "Retour à la connexion" : "Back to sign in"}</Link></div>
        </div>
      ) : done ? (
        <div role="status" aria-live="polite" className="rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--signal-strong)_40%,var(--line))] bg-[var(--signal-soft)] p-5 sm:p-6">
          <CheckCircle2 aria-hidden="true" className="text-[var(--signal-strong)]" size={28} />
          <h2 className="mt-4 text-2xl font-semibold">{locale === "fr" ? "Votre accès est sécurisé" : "Your access is secure"}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{locale === "fr" ? "Le nouveau mot de passe est actif. Vous pouvez maintenant vous reconnecter à votre espace Parigo." : "Your new password is active. You can now sign back in to your Parigo workspace."}</p>
          <Link href={localizedPath("/login")} className={`${primaryLinkClass} mt-6 w-full sm:w-auto`}>{locale === "fr" ? "Se connecter" : "Sign in"}</Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <PasswordCreationField id="reset-password" label={locale === "fr" ? "Nouveau mot de passe" : "New password"} placeholder={locale === "fr" ? "Votre nouveau mot de passe" : "Your new password"} value={password} onChange={setPassword} showStrength disabled={pending} />
          <PasswordCreationField id="reset-password-confirmation" label={locale === "fr" ? "Confirmer le mot de passe" : "Confirm password"} placeholder={locale === "fr" ? "Saisissez-le à nouveau" : "Enter it again"} value={confirmation} onChange={setConfirmation} confirmationOf={password} showLabel={locale === "fr" ? "Afficher la confirmation du mot de passe" : "Show password confirmation"} hideLabel={locale === "fr" ? "Masquer la confirmation du mot de passe" : "Hide password confirmation"} disabled={pending} />
          {error ? <div role="alert" className="contact-consent-error !block"><p className="leading-6">{error}</p></div> : null}
          <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? <ParigoLoader size="icon" label={locale === "fr" ? "Mise à jour du mot de passe" : "Updating password"} /> : null}{pending ? (locale === "fr" ? "Mise à jour…" : "Updating…") : (locale === "fr" ? "Sécuriser mon accès" : "Secure my access")}</Button>
        </form>
      )}
    </PasswordRecoveryCard>
  );
}
