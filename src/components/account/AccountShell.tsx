"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Header, Footer } from "@/components/layout";
import { useI18n } from "@/components/providers/I18nProvider";
import { PageHero } from "@/components/layout/PageHero";
import { AccountNavigation } from "./AccountNavigation";

export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { locale, t } = useI18n();

  return (
    <div className="page-shell flex min-h-screen flex-col overflow-x-clip">
      <Header />
      <PageHero
        title={t("account.title")}
        intro={locale === "fr" ? "Retrouvez vos recherches, sélections et préférences au même endroit." : "Find your searches, selections and preferences in one place."}
        containerClassName="max-w-[1600px]"
      />
      <div className="flex-1 pb-[var(--space-page-end)] pt-[var(--space-page-hero-follow)]">
        <div className="mx-auto max-w-[1600px] px-4 lg:px-8">
          <div className="flex min-w-0 flex-col gap-[var(--space-account-flow)] lg:flex-row">
            <AccountNavigation />
            <main className="min-w-0 flex-1">
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
