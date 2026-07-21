"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";

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
    if (validity !== "valid" || password.length < 8 || password !== confirmation) return setError(locale === "fr" ? "Vérifiez les deux mots de passe." : "Check both passwords.");
    const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
    if (response.ok) setDone(true); else { setValidity("invalid"); setError(locale === "fr" ? "Ce lien est invalide ou expiré." : "This link is invalid or expired."); }
  }
  return <Card padding="lg" className="w-full max-w-lg border-[var(--line)] bg-[var(--surface)] shadow-none"><h1 className="font-[var(--font-editorial)] text-5xl tracking-[-.05em]">{locale === "fr" ? "Nouveau mot de passe" : "New password"}</h1>{validity === "checking" ? <div className="mt-8 flex items-center gap-3"><Loader2 className="animate-spin" size={18} />{locale === "fr" ? "Validation du lien Parigo…" : "Validating the Parigo link…"}</div> : validity === "invalid" ? <p className="mt-8 text-red-700">{locale === "fr" ? "Ce lien est invalide ou expiré. Demandez un nouveau lien depuis la page de connexion." : "This link is invalid or expired. Request a new link from the sign-in page."}</p> : done ? <p className="mt-8"><Link href="/login" className="underline">{locale === "fr" ? "Mot de passe modifié — se connecter" : "Password updated — sign in"}</Link></p> : <form onSubmit={submit} className="mt-8 space-y-5"><Input type="password" required minLength={8} autoComplete="new-password" placeholder={locale === "fr" ? "Nouveau mot de passe" : "New password"} value={password} onChange={(event) => setPassword(event.target.value)} /><Input type="password" required minLength={8} autoComplete="new-password" placeholder={locale === "fr" ? "Confirmer" : "Confirm"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />{error && <p className="text-sm text-red-600">{error}</p>}<Button type="submit" className="w-full">{locale === "fr" ? "Mettre à jour" : "Update password"}</Button></form>}</Card>;
}

export default function ResetPasswordPage() { return <Suspense><ResetPasswordContent /></Suspense>; }
