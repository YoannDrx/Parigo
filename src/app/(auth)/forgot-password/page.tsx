"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { PasswordRecoveryCard } from "@/components/features/PasswordRecoveryCard";
import { useI18n } from "@/components/providers/I18nProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ParigoLoader } from "@/components/ui/ParigoLoader";

const primaryLinkClass = "inline-flex min-h-12 items-center justify-center border border-[var(--signal-strong)] bg-[var(--signal-strong)] px-6 py-3 text-center text-sm font-semibold !text-[#102014] transition-colors hover:border-[var(--foreground)] hover:bg-[var(--foreground)] hover:!text-[var(--background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-strong)] focus-visible:ring-offset-2";

export default function ForgotPasswordPage() {
  const { locale, localizedPath } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => null);
      if (response.ok && payload?.data?.deliveryConfigured !== false) {
        setSent(true);
      } else {
        setError(locale === "fr"
          ? "La réinitialisation par e-mail n’est pas encore configurée. Contactez Parigo pour récupérer votre accès."
          : "Email password reset is not configured yet. Contact Parigo to recover access.");
      }
    } catch {
      setError(locale === "fr"
        ? "Le service est momentanément indisponible. Réessayez dans quelques instants."
        : "The service is temporarily unavailable. Try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <PasswordRecoveryCard
      icon={ShieldCheck}
      title={locale === "fr" ? "Retrouver votre accès" : "Recover your access"}
      intro={locale === "fr"
        ? "Indiquez l’adresse utilisée pour votre compte Parigo. Si elle est reconnue, vous recevrez un lien sécurisé pour choisir un nouveau mot de passe."
        : "Enter the address used for your Parigo account. If it is recognised, you will receive a secure link to choose a new password."}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={localizedPath("/login")} className="font-medium underline underline-offset-4">{locale === "fr" ? "Retour à la connexion" : "Back to sign in"}</Link>
          <Link href={localizedPath("/contact")} className="font-medium underline underline-offset-4">{locale === "fr" ? "Besoin d’aide ?" : "Need help?"}</Link>
        </div>
      }
    >
      {sent ? (
        <div role="status" aria-live="polite" className="rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--signal-strong)_40%,var(--line))] bg-[var(--signal-soft)] p-5 sm:p-6">
          <CheckCircle2 aria-hidden="true" className="text-[var(--signal-strong)]" size={28} />
          <h2 className="mt-4 text-2xl font-semibold">{locale === "fr" ? "Consultez votre boîte mail" : "Check your inbox"}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            {locale === "fr" ? "Si un compte correspond à cette adresse, le lien vient d’être envoyé. Pensez à vérifier les courriers indésirables." : "If an account matches this address, the link has just been sent. Remember to check your spam folder."}
          </p>
          <Link href={localizedPath("/login")} className={`${primaryLinkClass} mt-6 w-full sm:w-auto`}>{locale === "fr" ? "Retour à la connexion" : "Back to sign in"}</Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <label htmlFor="reset-email" className="block text-sm font-medium">
            <span className="mb-2 block">{locale === "fr" ? "Adresse e-mail du compte" : "Account email address"}</span>
            <Input
              id="reset-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              icon={<Mail aria-hidden="true" size={18} />}
              required
              disabled={pending}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nom@entreprise.com"
            />
          </label>
          <p className="text-xs leading-5 text-[var(--text-muted)]">{locale === "fr" ? "Le lien est personnel et limité dans le temps." : "The link is personal and time-limited."}</p>
          {error ? <div role="alert" className="contact-consent-error !block"><p className="leading-6">{error}</p></div> : null}
          <Button type="submit" size="lg" disabled={pending || !email.trim()} className="w-full">
            {pending ? <ParigoLoader size="icon" label={locale === "fr" ? "Envoi du lien" : "Sending reset link"} /> : null}
            {pending ? (locale === "fr" ? "Envoi…" : "Sending…") : (locale === "fr" ? "Recevoir mon lien sécurisé" : "Send my secure link")}
          </Button>
        </form>
      )}
    </PasswordRecoveryCard>
  );
}
