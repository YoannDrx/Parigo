import type { Metadata } from "next";
import { Archivo, Manrope, IBM_Plex_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";

const archivo = Archivo({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-editorial",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('parigo-theme');var v=t==='dark'||t==='light'?t:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=v;document.documentElement.style.colorScheme=v;var l=localStorage.getItem('parigo-locale');if(l==='en'||l==='fr')document.documentElement.lang=l}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${archivo.variable} ${manrope.variable} ${ibmPlexMono.variable} ${instrumentSerif.variable} antialiased`}
      >
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
