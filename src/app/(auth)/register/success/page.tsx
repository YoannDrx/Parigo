"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { MailCheck } from "lucide-react";
import { Card } from "@/components/ui";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { useI18n } from "@/components/providers/I18nProvider";

function RegistrationSuccess() {
  const { locale } = useI18n();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const initialEmailSent = searchParams.get("sent") !== "0";
  return (
    <Card padding="lg" className="w-full max-w-xl border-[var(--line)] bg-[var(--surface)] text-center shadow-none">
      <MailCheck className="mx-auto mb-6 text-[var(--signal-strong)]" size={42} />
      <p className="eyebrow mb-4">Compte Parigo</p>
      <SignedTitle className="font-[var(--font-editorial)] text-5xl tracking-[-.05em]">{locale === "fr" ? "Vérifiez votre adresse" : "Verify your address"}</SignedTitle>
      <p className="mx-auto mt-5 max-w-md leading-7 text-[var(--text-muted)]">
        {initialEmailSent
          ? locale === "fr"
            ? `Un lien de validation a été envoyé${email ? ` à ${email}` : ""}. Cliquez dessus pour activer vous-même votre compte, puis vous pourrez vous connecter.`
            : `A verification link was sent${email ? ` to ${email}` : ""}. Follow it to activate your account, then you can sign in.`
          : locale === "fr"
            ? "Votre compte a bien été créé, mais l’envoi du lien n’a pas pu être confirmé. Contactez Parigo si vous ne recevez rien."
            : "Your account was created, but delivery of the verification link could not be confirmed. Contact Parigo if nothing arrives."}
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--text-muted)]">{locale === "fr" ? "Vous ne le voyez pas ? Vérifiez aussi le dossier des courriers indésirables." : "Can’t see it? Please check your spam folder too."}</p>
      <Link href="/login" className="mt-7 inline-flex min-h-11 items-center border border-[var(--line)] px-5 text-sm">{locale === "fr" ? "Retour à la connexion" : "Back to sign in"}</Link>
    </Card>
  );
}

export default function RegisterSuccessPage() {
  return <Suspense><RegistrationSuccess /></Suspense>;
}
