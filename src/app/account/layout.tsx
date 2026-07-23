"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  User,
  Heart,
  ListMusic,
  Clock,
  Download,
  Settings,
  Tags,
  Search,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { redirect } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { useI18n } from "@/components/providers/I18nProvider";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = useSession();
  const pathname = usePathname();
  const { t } = useI18n();
  const navItems = [
    { icon: User, label: t("account.profile"), href: "/account" },
    { icon: Heart, label: t("account.favorites"), href: "/account/favorites" },
    { icon: ListMusic, label: t("account.playlists"), href: "/account/playlists" },
    { icon: Search, label: t("account.searches"), href: "/account/searches" },
    { icon: Clock, label: t("account.history"), href: "/account/history" },
    { icon: Download, label: t("account.downloads"), href: "/account/downloads" },
    { icon: Tags, label: t("account.tags"), href: "/account/tags" },
    { icon: Settings, label: t("account.settings"), href: "/account/settings" },
  ];

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
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <header className="account-hero border-b border-[var(--line)] px-4 pb-16 pt-32 md:px-8 md:pb-20 md:pt-40"><div className="relative z-[1] mx-auto max-w-[1600px]"><p className="eyebrow mb-5 text-[var(--color-primary-dark)]">{t("account.eyebrow")}</p><h1 className="text-6xl font-semibold tracking-[-.055em] md:text-8xl">{t("account.title")}</h1></div></header>
      <div className="flex-1 pb-32 pt-10 md:pt-16">
      <div className="mx-auto max-w-[1600px] px-4 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="flex-shrink-0 lg:w-64">
            <div className="sticky top-24">
              <nav className="account-nav flex overflow-x-auto border border-[var(--line-strong)] p-1.5 lg:block">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-active={isActive}
                      className={`account-nav__link flex min-h-12 shrink-0 items-center gap-3 px-4 py-3 lg:w-full ${
                        isActive
                          ? ""
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      <item.icon size={20} />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
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
