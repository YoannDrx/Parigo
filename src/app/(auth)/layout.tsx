"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { ParigoLogo } from "@/components/layout/ParigoLogo";
import { useI18n } from "@/components/providers/I18nProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { alternateLocalePath, localizedPath } from "@/lib/locale";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const usesSwitcher = /\/(?:login|register)$/.test(pathname);
  const isForgotPassword = pathname.endsWith("/forgot-password");
  const isResetPassword = /\/(?:reset-password|change-password)(?:\/[^/]+)?$/.test(pathname);
  const authVisual = isForgotPassword
    ? {
        src: "/images/editorial/parigo-selected/r11-v1-forgot-password-1200x1500.avif",
        photoId: "R11V1",
      }
    : isResetPassword
      ? {
          src: "/images/editorial/parigo-selected/r13-v2-password-recovery-1200x1500.avif",
          photoId: "R13V2",
        }
      : {
          src: "/images/editorial/parigo-spaces/35-account-verification-signal.avif",
          photoId: "R16",
        };

  const chromeHeader = (
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
  );

  if (usesSwitcher) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-[var(--surface-soft)] text-[var(--foreground)]">
        {chromeHeader}
        <main className="relative flex min-h-0 flex-1 items-start justify-center p-3 py-6 md:items-center md:p-8">
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,color-mix(in_srgb,var(--signal-soft)_65%,transparent),transparent_34%),radial-gradient(circle_at_90%_85%,color-mix(in_srgb,var(--signal)_10%,transparent),transparent_32%)]" />
          <div className="relative z-[1] flex h-full min-h-0 w-full justify-center">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="grid h-dvh grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden bg-[var(--background)] text-[var(--foreground)] lg:grid-cols-[minmax(0,1.08fr)_minmax(30rem,.92fr)] lg:grid-rows-[auto_minmax(0,1fr)]">
      <div className="lg:col-start-1 lg:row-start-1">{chromeHeader}</div>
      <aside
        data-testid="password-recovery-artwork"
        data-photo-id={authVisual.photoId}
        className="relative row-start-2 min-h-44 overflow-hidden bg-[#11120f] sm:min-h-56 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:min-h-0"
      >
        <Image src={authVisual.src} alt="" fill loading="eager" fetchPriority="high" sizes="(max-width: 1023px) 100vw, 46vw" className="object-cover" />
      </aside>
      <main className="relative row-start-3 flex min-h-0 items-center justify-center overflow-y-auto px-4 py-5 sm:px-8 sm:py-6 lg:col-start-1 lg:row-start-2 lg:px-12 xl:px-16">
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_15%,color-mix(in_srgb,var(--signal-soft)_60%,transparent),transparent_35%)]" />
        <div className="relative z-[1] w-full">{children}</div>
      </main>
    </div>
  );
}
