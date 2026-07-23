import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getRequestLocale } from "@/lib/locale-server";
import { localizedPath } from "@/lib/locale";

export const metadata = { robots: { index: false, follow: false } };

export default async function NotFound() {
  const locale = await getRequestLocale();
  return <main className="grain flex min-h-screen items-center justify-center bg-[#11120f] px-4 text-[#f1efe7]"><div className="text-center"><p className="eyebrow text-[var(--signal)]">404 · {locale === "fr" ? "Hors signal" : "Off signal"}</p><h1 className="mt-6 font-[var(--font-editorial)] text-6xl font-normal tracking-[-.055em] md:text-9xl">{locale === "fr" ? "Cette page n’existe pas." : "This page does not exist."}</h1><p className="mx-auto mt-6 max-w-lg opacity-60">{locale === "fr" ? "Revenez au catalogue pour reprendre la recherche." : "Return to the catalogue and resume your search."}</p><Link href={localizedPath(locale, "/")} className="mt-10 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--signal)] px-6 font-semibold text-[#11120f]"><ArrowLeft size={17}/> {locale === "fr" ? "Retour à l’accueil" : "Back home"}</Link></div></main>;
}
