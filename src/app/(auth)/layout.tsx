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
        fr: "Retrouvez le fil de votre accès.",
        en: "Rewind and recover your access.",
      }
    : isResetPassword
      ? {
          src: "/images/editorial/parigo-selected/r13-v2-password-recovery-1200x1500.avif",
          photoId: "R13V2",
          fr: "Reconnectez votre accès à Parigo.",
          en: "Reconnect your access to Parigo.",
        }
      : {
          src: "/images/editorial/parigo-spaces/35-account-verification-signal.avif",
          photoId: "R16",
          fr: "Gardez le fil de toutes vos intuitions.",
          en: "Keep track of every creative intuition.",
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

  const chromeFooter = <footer className="relative z-10 px-4 py-5 text-center text-xs opacity-35">© {new Date().getFullYear()} Parigo Music</footer>;

  if (usesSwitcher) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--surface-soft)] text-[var(--foreground)]">
        {chromeHeader}
        <main className="relative flex flex-1 items-start justify-center p-3 py-6 md:items-center md:p-8">
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,color-mix(in_srgb,var(--signal-soft)_65%,transparent),transparent_34%),radial-gradient(circle_at_90%_85%,color-mix(in_srgb,var(--signal)_10%,transparent),transparent_32%)]" />
          <div className="relative z-[1] flex w-full justify-center">{children}</div>
        </main>
        {chromeFooter}
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-rows-[auto_auto_1fr_auto] bg-[var(--background)] text-[var(--foreground)] lg:grid-cols-[minmax(0,1.08fr)_minmax(30rem,.92fr)] lg:grid-rows-[auto_1fr_auto]">
      <div className="lg:col-start-1 lg:row-start-1">{chromeHeader}</div>
      <aside
        data-testid="password-recovery-artwork"
        data-photo-id={authVisual.photoId}
        className="relative row-start-2 min-h-44 overflow-hidden bg-[#11120f] sm:min-h-56 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:min-h-screen"
      >
        <Image src={authVisual.src} alt="" fill loading="eager" fetchPriority="high" sizes="(max-width: 1023px) 100vw, 46vw" className="object-cover opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-black/20" />
        <p className="absolute left-5 top-5 rounded-full border border-white/25 bg-black/20 px-4 py-2 font-mono text-[.58rem] uppercase tracking-[.14em] text-white backdrop-blur-md sm:left-7 sm:top-7 lg:left-10 lg:top-10">
          {locale === "fr" ? "Accès Parigo" : "Parigo access"} · {authVisual.photoId}
        </p>
        <p className="absolute bottom-5 left-5 max-w-[13ch] text-2xl font-semibold leading-[.94] tracking-[-.045em] text-[#f2efe7] sm:bottom-7 sm:left-7 sm:text-3xl lg:bottom-10 lg:left-10 lg:text-5xl">
          {authVisual[locale]}
        </p>
      </aside>
      <main className="relative row-start-3 flex items-center justify-center px-4 py-8 sm:px-8 sm:py-12 lg:col-start-1 lg:row-start-2 lg:px-12 xl:px-16">
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_15%,color-mix(in_srgb,var(--signal-soft)_60%,transparent),transparent_35%)]" />
        <div className="relative z-[1] w-full">{children}</div>
      </main>
      <div className="row-start-4 lg:col-start-1 lg:row-start-3">{chromeFooter}</div>
    </div>
  );
}
