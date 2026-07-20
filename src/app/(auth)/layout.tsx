"use client";

import Image from "next/image";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useTheme } from "@/components/providers/ThemeProvider";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { locale, t, toggleLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  return <div className="grid min-h-screen bg-[var(--background)] text-[var(--foreground)] lg:grid-cols-2"><div className="flex min-h-screen flex-col"><header className="flex h-20 items-center justify-between px-4 md:px-8"><Link href="/" className="font-[var(--font-heading)] text-2xl font-semibold tracking-[-.08em]">PARIGO<span className="text-[var(--signal)]">.</span></Link><div className="flex items-center gap-2"><button onClick={toggleLocale} className="flex h-11 min-w-11 items-center justify-center rounded-full border border-[var(--line)] px-3 font-mono text-[.65rem]" aria-label={t("common.language")}>{locale === "fr" ? "EN" : "FR"}</button><button onClick={toggleTheme} className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)]" aria-label={theme === "light" ? t("common.themeDark") : t("common.themeLight")}>{theme === "light" ? <Moon size={17} /> : <Sun size={17} />}</button></div></header><main className="flex flex-1 items-center justify-center p-4 md:p-8">{children}</main><footer className="px-4 py-5 text-center text-xs opacity-35">© {new Date().getFullYear()} Parigo Music</footer></div><aside className="grain relative hidden overflow-hidden bg-[#11120f] lg:block"><Image src="/images/synchros/kleo-original-86.jpg" alt="" fill priority sizes="50vw" className="object-cover grayscale opacity-75" /><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/15" /><p className="absolute bottom-10 left-10 max-w-xl font-[var(--font-editorial)] text-6xl font-normal leading-[.86] tracking-[-.05em] text-[#f2efe7]">{locale === "fr" ? "Gardez le fil de toutes vos intuitions." : "Keep track of every creative intuition."}</p></aside></div>;
}
