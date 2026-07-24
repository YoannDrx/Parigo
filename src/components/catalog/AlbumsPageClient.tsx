"use client";

import { Header, Footer } from "@/components/layout";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Album, SearchFacets } from "@/types";
import { AlbumExplorer } from "./AlbumExplorer";
import { CatalogHero } from "./CatalogHero";

interface AlbumsPageClientProps {
  initialAlbums: {
    albums: Album[];
    facets?: SearchFacets;
    pagination: { total: number; limit: number; offset: number; hasMore: boolean };
  };
}

export function AlbumsPageClient({ initialAlbums }: AlbumsPageClientProps) {
  const { t } = useI18n();
  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <CatalogHero
          eyebrow={t("catalog.albumsEyebrow")}
          title={t("catalog.albumsTitle")}
          intro={t("catalog.albumsIntro")}
          meta={`${initialAlbums.pagination.total} ${t("common.albums").toLowerCase()}`}
        />
        <div className="mx-auto max-w-[1700px] px-4 py-10 sm:px-6 md:py-16 lg:px-8">
          <AlbumExplorer initialData={initialAlbums} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
