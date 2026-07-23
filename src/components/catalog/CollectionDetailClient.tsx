"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header, Footer } from "@/components/layout";
import { CatalogHero } from "@/components/catalog";
import { AlbumCard } from "@/components/features/AlbumCard";
import { useI18n } from "@/components/providers/I18nProvider";
import type { CatalogCategory } from "@/types";

export function CollectionDetailClient({ collection, albums }: { collection: CatalogCategory; albums: import("@/types").Album[] }) {
  const { locale, localizedPath } = useI18n();

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <CatalogHero eyebrow="Parigo / Collection" title={collection.name} intro={locale === "fr" ? "Albums associés à cette collection Parigo." : "Albums associated with this Parigo collection."} meta={`${albums.length} albums`} />
        <section className="mx-auto max-w-[1600px] px-4 py-16 md:px-8 md:py-24">
          <Link href={localizedPath("/collections")} className="mb-10 inline-flex items-center gap-2 text-sm"><ArrowLeft size={16} />{locale === "fr" ? "Toutes les collections" : "All collections"}</Link>
          <div className="grid gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{albums.map((album) => <AlbumCard key={album.id} album={album} />)}</div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
