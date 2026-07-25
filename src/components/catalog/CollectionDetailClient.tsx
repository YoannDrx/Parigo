"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header, Footer } from "@/components/layout";
import { CatalogHero } from "@/components/catalog";
import { AlbumExplorer } from "@/components/catalog/AlbumExplorer";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Album, CatalogCategory, SearchFacets } from "@/types";

interface CollectionAlbums {
  albums: Album[];
  facets?: SearchFacets;
  pagination: { total: number; limit: number; offset: number; hasMore: boolean };
}

export function CollectionDetailClient({ collection, albums }: { collection: CatalogCategory; albums: CollectionAlbums }) {
  const { locale, localizedPath } = useI18n();
  const albumCountLabel = `${albums.pagination.total} ${albums.pagination.total === 1 ? "album" : "albums"}`;
  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <CatalogHero
          eyebrow="Parigo / Collection"
          title={collection.name}
          intro={locale === "fr" ? "Explorez tous les albums associés à cet univers, puis affinez par ambiance, instrument, période ou usage." : "Explore every album associated with this musical world, then refine by mood, instrument, period or use."}
          meta={albumCountLabel}
        />
        <section className="mx-auto max-w-[1700px] px-4 py-16 md:px-8 md:py-24">
          <Link href={localizedPath("/collections")} className="mb-10 inline-flex min-h-11 items-center gap-2 text-sm"><ArrowLeft size={16} />{locale === "fr" ? "Toutes les collections" : "All collections"}</Link>
          <AlbumExplorer
            initialData={albums}
            fixedStyle={collection.id}
            headingLevel={3}
            queryPlaceholder={{
              fr: `Rechercher dans la collection ${collection.name}`,
              en: `Search the ${collection.name} collection`,
            }}
          />
        </section>
      </main>
      <Footer />
    </div>
  );
}
