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
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { redirect } from "next/navigation";

const navItems = [
  { icon: User, label: "Mon compte", href: "/account" },
  { icon: Heart, label: "Mes favoris", href: "/account/favorites" },
  { icon: ListMusic, label: "Mes playlists", href: "/account/playlists" },
  { icon: Clock, label: "Historique", href: "/account/history" },
  { icon: Download, label: "Téléchargements", href: "/account/downloads" },
  { icon: Settings, label: "Paramètres", href: "/account/settings" },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = useSession();
  const pathname = usePathname();

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
    <div className="min-h-screen pt-24 pb-32">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="sticky top-24">
              <nav className="bg-white border-2 border-[var(--color-black)] rounded-[var(--radius-md)] shadow-[4px_4px_0px_var(--color-black)] overflow-hidden">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        isActive
                          ? "bg-[var(--color-primary)] text-white"
                          : "text-[var(--color-black)] hover:bg-[var(--color-gray-100)]"
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
  );
}
