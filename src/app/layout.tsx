import type { Metadata } from "next";
import { Archivo, Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { cookies, headers } from "next/headers";
import { isLocale } from "@/lib/locale";
import { siteConfig } from "@/lib/seo";
import { CONSENT_COOKIE_NAME, CONSENT_UNSET, normalizeConsentSnapshot } from "@/lib/consent";
import { CookieConsentBanner } from "@/components/privacy/CookieConsentBanner";

const archivo = Archivo({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "optional",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "optional",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Parigo Music — La musique juste pour l'image",
    template: "%s — Parigo Music",
  },
  description:
    "Bibliothèque de musique de production pour l'image — a production music library built for moving images.",
  keywords: [
    "production music",
    "music library",
    "sync licensing",
    "film music",
    "TV music",
    "advertising music",
  ],
  authors: [{ name: "Parigo Music" }],
  openGraph: {
    title: "Parigo Music | Music For Images",
    description:
      "Trouvez, écoutez et sélectionnez la musique juste pour vos images. Find, listen and select the right music for moving images.",
    type: "website",
    locale: "fr_FR",
    alternateLocale: "en_US",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [headerStore, cookieStore] = await Promise.all([headers(), cookies()]);
  const localeHeader = headerStore.get("x-parigo-locale");
  const locale = isLocale(localeHeader) ? localeHeader : "fr";
  const initialConsentSnapshot = normalizeConsentSnapshot(cookieStore.get(CONSENT_COOKIE_NAME)?.value);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('parigo-theme');var v=t==='dark'||t==='light'?t:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=v;document.documentElement.style.colorScheme=v}catch(e){}})()`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${archivo.variable} ${manrope.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <QueryProvider initialLocale={locale} initialConsentSnapshot={initialConsentSnapshot}>
          {children}
        </QueryProvider>
        {initialConsentSnapshot === CONSENT_UNSET && <CookieConsentBanner locale={locale} />}
      </body>
    </html>
  );
}
