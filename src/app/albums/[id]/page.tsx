import type { Metadata } from "next";
import { AlbumDetailClient } from "@/components/catalog/AlbumDetailClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCachedAlbum } from "@/lib/harvest/catalog-cache";
import { rethrowCatalogError } from "@/lib/harvest/route-errors";
import { getRequestLocale } from "@/lib/locale-server";
import { absoluteUrl, buildMetadata } from "@/lib/seo";

interface AlbumPageProps {
  params: Promise<{ id: string }>;
}

async function loadAlbum(id: string) {
  try {
    return await getCachedAlbum(id);
  } catch (error) {
    rethrowCatalogError(error);
  }
}

export async function generateMetadata({ params }: AlbumPageProps): Promise<Metadata> {
  const [{ id }, locale] = await Promise.all([params, getRequestLocale()]);
  const { album } = await loadAlbum(id);
  const description = album.description
    || (locale === "fr"
      ? `Écoutez ${album.title}, un album de ${album.label} disponible pour la synchronisation.`
      : `Listen to ${album.title}, an album by ${album.label} available for sync licensing.`);
  return buildMetadata({
    locale,
    path: `/albums/${id}`,
    title: album.title,
    description,
    image: album.cover,
  });
}

export default async function AlbumPage({ params }: AlbumPageProps) {
  const [{ id }, locale] = await Promise.all([params, getRequestLocale()]);
  const result = await loadAlbum(id);
  const album = result.album;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "MusicAlbum",
    name: album.title,
    url: absoluteUrl(`${locale === "en" ? "/en" : ""}/albums/${id}`),
    image: absoluteUrl(album.cover),
    description: album.description || undefined,
    datePublished: album.releaseDate,
    numTracks: album.trackCount,
    genre: album.genres,
    byArtist: album.artists?.map((artist) => ({ "@type": "MusicGroup", name: artist.name })),
    recordLabel: { "@type": "Organization", name: album.label },
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <AlbumDetailClient data={{ album, similarAlbums: result.similar }} />
    </>
  );
}
