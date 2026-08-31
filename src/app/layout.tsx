import type { Metadata } from "next";
import { Archivo, Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { cookies, headers } from "next/headers";
import { isLocale } from "@/lib/locale";
import { siteConfig } from "@/lib/seo";
import { CONSENT_COOKIE_NAME, normalizeConsentSnapshot } from "@/lib/consent";
import { ClientCookieConsentBanner } from "@/components/privacy/ClientCookieConsentBanner";
import type { Theme } from "@/components/providers/ThemeProvider";

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
  const storedTheme = cookieStore.get("parigo-theme")?.value;
  const initialTheme: Theme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : "dark";
  const initialConsentSnapshot = normalizeConsentSnapshot(cookieStore.get(CONSENT_COOKIE_NAME)?.value);

  return (
    <html lang={locale} data-theme={initialTheme} style={{ colorScheme: initialTheme }} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://d3vy0pmxxxelni.cloudfront.net" crossOrigin="" />
        <link rel="dns-prefetch" href="https://d3vy0pmxxxelni.cloudfront.net" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('parigo-theme');var v=t==='dark'||t==='light'?t:(document.documentElement.dataset.theme||'dark');document.documentElement.dataset.theme=v;document.documentElement.style.colorScheme=v}catch(e){}})()`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var valid=function(value){if(!value)return false;try{var parsed=JSON.parse(decodeURIComponent(value));return parsed.necessary===true&&typeof parsed.preferences==='boolean'&&typeof parsed.analytics==='boolean'&&typeof parsed.marketing==='boolean'&&typeof parsed.updatedAt==='string'}catch(e){return false}};var stored=localStorage.getItem('parigo-cookie-consent');var cookie=document.cookie.split('; ').find(function(entry){return entry.indexOf('parigo-consent=')===0});var cookieValue=cookie?cookie.slice('parigo-consent='.length):'';document.documentElement.dataset.parigoConsent=valid(stored)||valid(cookieValue)?'set':'unset'}catch(e){document.documentElement.dataset.parigoConsent='unset'}})()`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${archivo.variable} ${manrope.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <QueryProvider initialLocale={locale} initialConsentSnapshot={initialConsentSnapshot} initialTheme={initialTheme}>
          {children}
        </QueryProvider>
        <ClientCookieConsentBanner locale={locale} />
      </body>
    </html>
  );
}
