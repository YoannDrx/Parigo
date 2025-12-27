"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Menu, X, User } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

const navigation = [
  { name: "Recherche", href: "/search" },
  { name: "Albums", href: "/albums" },
  { name: "Playlists", href: "/playlists" },
  { name: "Labels", href: "/labels" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[var(--color-cream)] border-b-2 border-[var(--color-black)]">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[var(--color-primary)] border-2 border-[var(--color-black)] rounded-[var(--radius-sm)] shadow-[3px_3px_0px_var(--color-black)] flex items-center justify-center">
              <span className="text-white font-bold text-xl">P</span>
            </div>
            <span className="font-[var(--font-heading)] font-bold text-xl text-[var(--color-black)] hidden sm:block">
              Parigo
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-[var(--radius-sm)] transition-all duration-150",
                  pathname === item.href
                    ? "bg-[var(--color-primary)] text-white border-2 border-[var(--color-black)] shadow-[3px_3px_0px_var(--color-black)]"
                    : "text-[var(--color-black)] hover:bg-[var(--color-gray-100)] border-2 border-transparent hover:border-[var(--color-black)]"
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            <Link href="/search" className="md:hidden">
              <Button variant="ghost" size="sm" className="p-2">
                <Search size={20} />
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="hidden sm:flex gap-2">
              <User size={18} />
              <span>Connexion</span>
            </Button>

            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden p-2 rounded-[var(--radius-sm)] border-2 border-[var(--color-black)] shadow-[2px_2px_0px_var(--color-black)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t-2 border-[var(--color-black)]">
            <div className="flex flex-col gap-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 text-base font-medium rounded-[var(--radius-sm)] transition-all",
                    pathname === item.href
                      ? "bg-[var(--color-primary)] text-white border-2 border-[var(--color-black)] shadow-[3px_3px_0px_var(--color-black)]"
                      : "text-[var(--color-black)] hover:bg-[var(--color-gray-100)] border-2 border-transparent"
                  )}
                >
                  {item.name}
                </Link>
              ))}
              <Button variant="primary" size="md" className="mt-2">
                <User size={18} className="mr-2" />
                Connexion
              </Button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
