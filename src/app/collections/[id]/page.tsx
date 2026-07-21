"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Header, Footer } from "@/components/layout";
import { CatalogHero } from "@/components/catalog";
import { AlbumCard } from "@/components/features";
import { useAlbums } from "@/hooks/use-api";
import { useI18n } from "@/components/providers/I18nProvider";
import type { CatalogCategory } from "@/types";

export default function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { locale } = useI18n();
  const [collection, setCollection] = useState<CatalogCategory | null>(null);
  const { data, isLoading } = useAlbums({ styles: [id], limit: 60, sort: "releaseDate" });

  useEffect(() => {
    fetch("/api/collections").then((response) => response.json()).then((payload) => {
      setCollection((payload.data?.collections || []).find((item: CatalogCategory) => item.id === id) || null);
    });
  }, [id]);

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <CatalogHero eyebrow="Parigo / Collection" title={collection?.name || "Collection"} intro={locale === "fr" ? "Albums associés à cette collection Parigo." : "Albums associated with this Parigo collection."} meta={`${data?.pagination.total || 0} albums`} />
        <section className="mx-auto max-w-[1600px] px-4 py-16 md:px-8 md:py-24">
          <Link href="/collections" className="mb-10 inline-flex items-center gap-2 text-sm"><ArrowLeft size={16} />{locale === "fr" ? "Toutes les collections" : "All collections"}</Link>
          {isLoading ? <Loader2 className="mx-auto animate-spin" /> : <div className="grid gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{(data?.albums || []).map((album) => <AlbumCard key={album.id} album={album} />)}</div>}
        </section>
      </main>
      <Footer />
    </div>
  );
}
