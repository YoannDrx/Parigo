import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionDetailClient } from "@/components/catalog/CollectionDetailClient";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCachedAlbumDiscovery, getCachedStyles } from "@/lib/harvest/catalog-cache";
import { getRequestLocale } from "@/lib/locale-server";
import { absoluteUrl, buildMetadata, hasSearchParams, type PageSearchParams } from "@/lib/seo";

interface CollectionPageProps {
  params: Promise<{ id: string }>;
  searchParams: PageSearchParams;
}

async function loadCollection(id: string) {
  const [collections, albums] = await Promise.all([
    getCachedStyles(),
    getCachedAlbumDiscovery({ style: id, limit: 30, sort: "recent" }),
  ]);
  const collection = collections.find((item) => item.id === id || item.slug === id);
  if (!collection) notFound();
  return {
    collection,
    albums: {
      albums: albums.items,
      facets: albums.facets,
      pagination: {
        total: albums.total,
        limit: albums.pageSize,
        offset: 0,
        hasMore: albums.items.length < albums.total,
      },
    },
  };
}

export async function generateMetadata({ params, searchParams }: CollectionPageProps): Promise<Metadata> {
  const [{ id }, locale, filtered] = await Promise.all([params, getRequestLocale(), hasSearchParams(searchParams)]);
  const { collection } = await loadCollection(id);
  return buildMetadata({
    locale,
    path: `/collections/${id}`,
    title: collection.name,
    description: locale === "fr"
      ? `Explorez la collection ${collection.name} et trouvez une musique adaptée à vos images.`
      : `Explore the ${collection.name} collection and find music for your visual project.`,
    index: !filtered,
    follow: true,
  });
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const [{ id }, locale] = await Promise.all([params, getRequestLocale()]);
  const { collection, albums } = await loadCollection(id);
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: collection.name,
        url: absoluteUrl(`${locale === "en" ? "/en" : ""}/collections/${id}`),
        mainEntity: {
          "@type": "ItemList",
          itemListElement: albums.albums.map((album, position) => ({
            "@type": "ListItem",
            position: position + 1,
            name: album.title,
            url: absoluteUrl(`${locale === "en" ? "/en" : ""}/albums/${album.id}`),
          })),
        },
      }} />
      <ReactQueryProvider><CollectionDetailClient collection={collection} albums={albums} /></ReactQueryProvider>
    </>
  );
}
