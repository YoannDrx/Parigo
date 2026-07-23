import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionDetailClient } from "@/components/catalog/CollectionDetailClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCachedAlbums, getCachedStyles } from "@/lib/harvest/catalog-cache";
import { getRequestLocale } from "@/lib/locale-server";
import { absoluteUrl, buildMetadata } from "@/lib/seo";

interface CollectionPageProps {
  params: Promise<{ id: string }>;
}

async function loadCollection(id: string) {
  const [collections, albums] = await Promise.all([
    getCachedStyles(),
    getCachedAlbums({ style: id, limit: 60, sort: "releaseDate" }),
  ]);
  const collection = collections.find((item) => item.id === id || item.slug === id);
  if (!collection) notFound();
  return { collection, albums: albums.items };
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const [{ id }, locale] = await Promise.all([params, getRequestLocale()]);
  const { collection } = await loadCollection(id);
  return buildMetadata({
    locale,
    path: `/collections/${id}`,
    title: collection.name,
    description: locale === "fr"
      ? `Explorez la collection ${collection.name} et trouvez une musique adaptée à vos images.`
      : `Explore the ${collection.name} collection and find music for your visual project.`,
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
          itemListElement: albums.map((album, position) => ({
            "@type": "ListItem",
            position: position + 1,
            name: album.title,
            url: absoluteUrl(`${locale === "en" ? "/en" : ""}/albums/${album.id}`),
          })),
        },
      }} />
      <CollectionDetailClient collection={collection} albums={albums} />
    </>
  );
}
