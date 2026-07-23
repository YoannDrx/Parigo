"use client";

import { redirect, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useSession } from "@/lib/auth-client";
import { Header, Footer } from "@/components/layout";
import { useI18n } from "@/components/providers/I18nProvider";
import { RevealText } from "@/components/motion";
import { AccountNavigation } from "@/components/account/AccountNavigation";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = useSession();
  const pathname = usePathname();
  const { locale, t } = useI18n();

  // Redirect if not authenticated
  if (!isPending && !session?.user) {
    redirect("/login");
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-shell flex min-h-screen flex-col overflow-x-clip">
      <Header />
      <header className="account-hero institutional-hero border-b border-[var(--line)] px-4 pb-12 pt-28 md:px-8 md:pb-20 md:pt-36">
        <div className="relative z-[1] mx-auto max-w-[1600px]">
          <div className="account-hero__frame parigo-frame grid gap-10 border border-[var(--line-strong)] bg-[var(--surface)] p-6 md:grid-cols-12 md:p-10 lg:p-14">
            <div className="relative min-w-0 md:col-span-8">
              <p className="eyebrow mb-7 text-[var(--signal-strong)]">{locale === "fr" ? "Compte Parigo" : "Parigo account"}</p>
              <RevealText as="h1" className="section-title-serif max-w-5xl break-words">{t("account.title")}</RevealText>
            </div>
            <div className="relative flex flex-col justify-between border-t border-[var(--line)] pt-6 md:col-span-3 md:col-start-10 md:border-l md:border-t-0 md:pl-8 md:pt-0">
              <p className="max-w-xl text-base leading-7 text-[var(--text-muted)] md:text-lg">{locale === "fr" ? "Retrouvez vos recherches, sélections et préférences au même endroit." : "Find your searches, selections and preferences in one place."}</p>
              <p className="mt-10 font-mono text-[.56rem] uppercase tracking-[.14em] text-[var(--text-muted)]">{locale === "fr" ? "Parigo Music · Espace membre" : "Parigo Music · Member space"}</p>
            </div>
          </div>
        </div>
      </header>
      <div className="flex-1 pb-32 pt-10 md:pt-16">
      <div className="mx-auto max-w-[1600px] px-4 lg:px-8">
        <div className="flex min-w-0 flex-col gap-8 lg:flex-row">
          <AccountNavigation />

          <main className="flex-1 min-w-0">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: .48, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
}
