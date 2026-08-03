"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { useI18n } from "@/components/providers/I18nProvider";

function VerifyContent() {
  const { locale } = useI18n();
  const token = useSearchParams().get("token") || "";
  const [status, setStatus] = useState<"validating" | "confirming" | "verified" | "error">(token ? "validating" : "error");
  useEffect(() => {
    if (!token) return;
    const verify = async () => {
      const validation = await fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`, { cache: "no-store" });
      if (!validation.ok) return setStatus("error");
      setStatus("confirming");
      const confirmation = await fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      setStatus(confirmation.ok ? "verified" : "error");
    };
    void verify();
  }, [token]);
  return <Card padding="lg" className="w-full max-w-lg border-[var(--line)] bg-[var(--surface)] shadow-none"><SignedTitle className="font-[var(--font-editorial)] text-5xl tracking-[-.05em]">{locale === "fr" ? "Vérification du compte" : "Account verification"}</SignedTitle><div className="mt-8 leading-7">{status === "validating" && (locale === "fr" ? "Validation du lien Parigo…" : "Validating the Parigo link…")}{status === "confirming" && (locale === "fr" ? "Activation de votre compte…" : "Activating your account…")}{status === "verified" && <><p>{locale === "fr" ? "Votre adresse est vérifiée et votre compte est activé. Vous pouvez maintenant vous connecter." : "Your email address is verified and your account is active. You can now sign in."}</p><Link href="/login" className="mt-5 inline-block underline">{locale === "fr" ? "Se connecter" : "Sign in"}</Link></>}{status === "error" && (locale === "fr" ? "Ce lien est invalide, déjà utilisé ou expiré. Contactez Parigo si le problème persiste." : "This link is invalid, already used, or expired. Contact Parigo if the problem persists.")}</div></Card>;
}

export default function VerifyPage() { return <Suspense><VerifyContent /></Suspense>; }
