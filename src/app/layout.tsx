import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Parigo Music | Music For Images",
  description:
    "Parigo Music - Bibliothèque de musique de production pour vos projets audiovisuels. Plus de 350 000 œuvres, 100+ labels internationaux.",
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
      "Bibliothèque de musique de production pour vos projets audiovisuels.",
    type: "website",
    locale: "fr_FR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
