import type { Metadata } from "next";
import Image from "next/image";
import { MoodsPhotoGallery } from "@/components/moods/MoodsPhotoGallery";
import { parigoImageGallery } from "@/data/parigo-image-gallery";

export const metadata: Metadata = {
  title: "Moods photos",
  description: "Exploration photographique pour le site Parigo Music.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      nosnippet: true,
    },
  },
};

export default function MoodsPhotosPage() {
  return (
    <main className="min-h-screen bg-[#0e0c09] text-[#f4f0e7]">
      <header className="px-4 pt-10 sm:px-8 sm:pt-14 lg:px-12 lg:pt-16">
        <div className="mx-auto max-w-[1800px]">
          <Image
            src="/images/parigo-logo-email.png"
            alt="Parigo"
            width={700}
            height={200}
            priority
            className="h-auto w-32 sm:w-40"
          />
          <h1 className="mt-10 max-w-4xl font-heading text-4xl font-medium leading-[1.02] tracking-[-0.045em] sm:mt-14 sm:text-6xl lg:text-7xl">
            Exploration photographique
          </h1>
          <div className="mt-10 border-t border-[#332b21] sm:mt-14" />
        </div>
      </header>

      <section className="px-4 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-[1800px]">
          <MoodsPhotoGallery images={parigoImageGallery} />
        </div>
      </section>

      <footer className="border-t border-[#332b21] px-4 py-8 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[#777064] sm:px-8">
        Parigo Music · Moods photos · {parigoImageGallery.length} visuels
      </footer>
    </main>
  );
}
