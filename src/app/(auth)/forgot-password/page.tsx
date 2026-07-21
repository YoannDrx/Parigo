"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, Input } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";

export default function ForgotPasswordPage() {
  const { locale } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setPending(false);
    if (response.ok) setSent(true);
    else setError(locale === "fr" ? "Impossible d’envoyer l’e-mail pour le moment." : "The email could not be sent right now.");
  }

  return (
    <Card padding="lg" className="w-full max-w-lg border-[var(--line)] bg-[var(--surface)] shadow-none">
      <p className="eyebrow text-[var(--color-primary-dark)]">Parigo Member</p>
      <h1 className="mt-5 font-[var(--font-editorial)] text-5xl font-normal tracking-[-.05em]">
        {locale === "fr" ? "Mot de passe oublié" : "Forgot password"}
      </h1>
      {sent ? (
        <div className="mt-8 space-y-5">
          <p>{locale === "fr" ? "Si ce compte existe, Parigo vient d’envoyer un lien de réinitialisation." : "If this account exists, Parigo has sent a reset link."}</p>
          <Link href="/login" className="underline">{locale === "fr" ? "Retour à la connexion" : "Back to sign in"}</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block text-sm font-medium" htmlFor="reset-email">Email</label>
          <Input id="reset-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={pending} className="w-full">{pending ? "…" : locale === "fr" ? "Envoyer le lien" : "Send reset link"}</Button>
        </form>
      )}
    </Card>
  );
}
