"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { ParigoLogo } from "@/components/layout/ParigoLogo";
import { useI18n } from "@/components/providers/I18nProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { alternateLocalePath, localizedPath } from "@/lib/locale";
import { cn } from "@/lib/utils";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const usesSwitcher = /\/(?:login|register)$/.test(pathname);

  return (
    <div className={cn("grid min-h-screen bg-[var(--background)] text-[var(--foreground)]", !usesSwitcher && "lg:grid-cols-2")}>
      <div className={cn("flex min-h-screen flex-col", usesSwitcher && "bg-[var(--surface-soft)]")}>
        <header className="relative z-20 flex h-20 shrink-0 items-center justify-between border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_78%,transparent)] px-4 backdrop-blur-xl md:px-8">
          <Link href={localizedPath(locale, "/")} aria-label={locale === "fr" ? "Parigo — Accueil" : "Parigo — Home"} className="group">
            <ParigoLogo className="text-[1.8rem]" />
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href={alternateLocalePath(pathname, locale)}
              hrefLang={locale === "fr" ? "en" : "fr"}
              className="flex h-11 min-w-11 items-center justify-center rounded-[var(--radius-sm)] px-3 font-mono text-[.65rem] transition hover:bg-[var(--surface-soft)]"
              aria-label={t("common.language")}
            >
              {locale === "fr" ? "EN" : "FR"}
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] transition hover:bg-[var(--surface-soft)]"
              aria-label={theme === "light" ? t("common.themeDark") : t("common.themeLight")}
            >
              {theme === "light" ? <Moon aria-hidden="true" size={17} /> : <Sun aria-hidden="true" size={17} />}
            </button>
          </div>
        </header>
        <main className={cn("relative flex flex-1 justify-center", usesSwitcher ? "items-start p-3 py-6 md:items-center md:p-8" : "items-center p-4 md:p-8")}>
          {usesSwitcher ? <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,color-mix(in_srgb,var(--signal-soft)_65%,transparent),transparent_34%),radial-gradient(circle_at_90%_85%,color-mix(in_srgb,var(--signal)_10%,transparent),transparent_32%)]" /> : null}
          <div className={cn("relative z-[1] w-full", usesSwitcher && "flex justify-center")}>{children}</div>
        </main>
        <footer className="relative z-10 px-4 py-5 text-center text-xs opacity-35">© {new Date().getFullYear()} Parigo Music</footer>
      </div>
      {!usesSwitcher ? (
        <aside className="relative hidden overflow-hidden bg-[#11120f] lg:block">
          <Image src="/images/synchros/kleo-original-86.jpg" alt="" fill priority sizes="50vw" className="object-cover grayscale opacity-75" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/15" />
          <p className="absolute bottom-10 left-10 max-w-xl text-5xl font-semibold leading-[.94] tracking-[-.05em] text-[#f2efe7]">
            {locale === "fr" ? "Gardez le fil de toutes vos intuitions." : "Keep track of every creative intuition."}
          </p>
        </aside>
      ) : null}
    </div>
  );
}
