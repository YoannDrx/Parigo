"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";

function VerifyContent() {
  const { locale } = useI18n();
  const token = useSearchParams().get("token") || "";
  const [status, setStatus] = useState<"validating" | "confirming" | "pending" | "error">(token ? "validating" : "error");
  useEffect(() => {
    if (!token) return;
    const verify = async () => {
      const validation = await fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`, { cache: "no-store" });
      if (!validation.ok) return setStatus("error");
      setStatus("confirming");
      const confirmation = await fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      setStatus(confirmation.ok ? "pending" : "error");
    };
    void verify();
  }, [token]);
  return <Card padding="lg" className="w-full max-w-lg border-[var(--line)] bg-[var(--surface)] shadow-none"><h1 className="font-[var(--font-editorial)] text-5xl tracking-[-.05em]">{locale === "fr" ? "Vérification du compte" : "Account verification"}</h1><div className="mt-8 leading-7">{status === "validating" && (locale === "fr" ? "Validation du lien Parigo…" : "Validating the Parigo link…")}{status === "confirming" && (locale === "fr" ? "Confirmation de votre adresse…" : "Confirming your address…")}{status === "pending" && <><p>{locale === "fr" ? "Votre adresse est vérifiée. Votre compte attend maintenant, si nécessaire, l’approbation Parigo. Vous recevrez un second e-mail lorsqu’il sera actif." : "Your address is verified. Your account is now awaiting Parigo approval, if required. You will receive a second email when it becomes active."}</p><Link href="/login" className="mt-5 inline-block underline">{locale === "fr" ? "Essayer de se connecter" : "Try signing in"}</Link></>}{status === "error" && (locale === "fr" ? "Ce lien est invalide, déjà utilisé ou expiré." : "This link is invalid, already used, or expired.")}</div></Card>;
}

export default function VerifyPage() { return <Suspense><VerifyContent /></Suspense>; }
