"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { useI18n } from "@/components/providers/I18nProvider";
import { PasswordCreationField } from "@/components/features/PasswordCreationField";
import { meetsPasswordPolicy } from "@/lib/password-strength";

function ResetPasswordContent() {
  const { locale } = useI18n();
  const token = useSearchParams().get("token") || "";
  const [validity, setValidity] = useState<"checking" | "valid" | "invalid">(token ? "checking" : "invalid");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!token) return;
    void fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`, { cache: "no-store" }).then((response) => setValidity(response.ok ? "valid" : "invalid"));
  }, [token]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (validity !== "valid" || !meetsPasswordPolicy(password) || password !== confirmation) return setError(locale === "fr" ? "Vérifiez les deux mots de passe." : "Check both passwords.");
    const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
    if (response.ok) setDone(true); else { setValidity("invalid"); setError(locale === "fr" ? "Ce lien est invalide ou expiré." : "This link is invalid or expired."); }
  }
  return <Card padding="lg" className="w-full max-w-lg border-[var(--line)] bg-[var(--surface)] shadow-none"><SignedTitle className="font-[var(--font-editorial)] text-5xl tracking-[-.05em]">{locale === "fr" ? "Nouveau mot de passe" : "New password"}</SignedTitle>{validity === "checking" ? <div className="mt-8 flex items-center gap-3"><ParigoLoader size="compact" label={locale === "fr" ? "Validation du lien Parigo" : "Validating the Parigo link"} /></div> : validity === "invalid" ? <p className="mt-8 text-red-700">{locale === "fr" ? "Ce lien est invalide ou expiré. Demandez un nouveau lien depuis la page de connexion." : "This link is invalid or expired. Request a new link from the sign-in page."}</p> : done ? <p className="mt-8"><Link href="/login" className="underline">{locale === "fr" ? "Mot de passe modifié — se connecter" : "Password updated — sign in"}</Link></p> : <form onSubmit={submit} className="mt-8 space-y-5"><PasswordCreationField id="reset-password" label={locale === "fr" ? "Nouveau mot de passe" : "New password"} placeholder={locale === "fr" ? "Nouveau mot de passe" : "New password"} value={password} onChange={setPassword} showStrength /><PasswordCreationField id="reset-password-confirmation" label={locale === "fr" ? "Confirmer le mot de passe" : "Confirm password"} placeholder={locale === "fr" ? "Confirmer" : "Confirm"} value={confirmation} onChange={setConfirmation} confirmationOf={password} showLabel={locale === "fr" ? "Afficher la confirmation du mot de passe" : "Show password confirmation"} hideLabel={locale === "fr" ? "Masquer la confirmation du mot de passe" : "Hide password confirmation"} />{error && <p className="text-sm text-red-600">{error}</p>}<Button type="submit" className="w-full">{locale === "fr" ? "Mettre à jour" : "Update password"}</Button></form>}</Card>;
}

export default function ResetPasswordPage() { return <Suspense><ResetPasswordContent /></Suspense>; }
