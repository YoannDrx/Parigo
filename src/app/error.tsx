"use client";

import { useEffect } from "react";
import { useI18n } from "@/components/providers/I18nProvider";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale } = useI18n();
  useEffect(() => { void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error)); }, [error]);
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-24 text-center">
      <div>
        <p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Signal interrompu" : "Signal interrupted"}</p>
        <h1 className="mt-5 font-[var(--font-editorial)] text-5xl font-normal md:text-7xl">{locale === "fr" ? "Le catalogue est momentanément indisponible." : "The catalogue is temporarily unavailable."}</h1>
        <p className="mx-auto mt-5 max-w-xl text-[var(--text-muted)]">{locale === "fr" ? "Aucun contenu n’a été déclaré introuvable. Réessayez dans quelques instants." : "No content has been marked as missing. Please try again shortly."}</p>
        {error.digest && <p className="mt-4 font-mono text-xs opacity-50">ID {error.digest}</p>}
        <button type="button" onClick={reset} className="mt-8 min-h-12 rounded-full bg-[var(--foreground)] px-6 font-semibold text-[var(--background)]">{locale === "fr" ? "Réessayer" : "Try again"}</button>
      </div>
    </main>
  );
}
