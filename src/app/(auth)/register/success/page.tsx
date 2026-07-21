"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { MailCheck } from "lucide-react";
import { Card } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";

function RegistrationSuccess() {
  const { locale } = useI18n();
  const email = useSearchParams().get("email");
  return <Card padding="lg" className="w-full max-w-xl border-[var(--line)] bg-[var(--surface)] text-center shadow-none"><MailCheck className="mx-auto mb-6" size={42} /><p className="eyebrow mb-4">Parigo / Parigo</p><h1 className="font-[var(--font-editorial)] text-5xl tracking-[-.05em]">{locale === "fr" ? "Vérifiez votre adresse" : "Verify your address"}</h1><p className="mx-auto mt-5 max-w-md leading-7 text-[var(--text-muted)]">{locale === "fr" ? `Un lien de vérification a été envoyé${email ? ` à ${email}` : ""}. Après vérification, votre compte peut nécessiter une approbation Parigo avant la première connexion.` : `A verification link was sent${email ? ` to ${email}` : ""}. After verification, your account may require Parigo approval before you can sign in.`}</p><Link href="/login" className="mt-8 inline-flex min-h-11 items-center border border-[var(--line)] px-5 text-sm">{locale === "fr" ? "Retour à la connexion" : "Back to sign in"}</Link></Card>;
}

export default function RegisterSuccessPage() {
  return <Suspense><RegistrationSuccess /></Suspense>;
}
