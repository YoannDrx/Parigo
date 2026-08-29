import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlbumDetailClient } from "@/components/catalog/AlbumDetailClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { PARIGO_LABEL_ID } from "@/config/catalog";
import { getCachedAlbum } from "@/lib/harvest/catalog-cache";
import { resolveAlbumDescription } from "@/lib/harvest/album-descriptions";
import { buildAlbumContributorGroups, buildTrackCreditLinks } from "@/lib/composers/album-credits";
import { rethrowCatalogError } from "@/lib/harvest/route-errors";
import { getRequestLocale } from "@/lib/locale-server";
import { absoluteUrl, buildMetadata } from "@/lib/seo";

interface AlbumPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    track?: string | string[];
    panel?: string | string[];
    highlight?: string | string[];
  }>;
}

async function loadAlbum(id: string) {
  if (!/^[a-f0-9]{16}$/i.test(id)) notFound();
  try {
    return await getCachedAlbum(id);
  } catch (error) {
    rethrowCatalogError(error);
  }
}

export async function generateMetadata({ params }: AlbumPageProps): Promise<Metadata> {
  const [{ id }, locale] = await Promise.all([params, getRequestLocale()]);
  const { album } = await loadAlbum(id);
  const description = resolveAlbumDescription(album, locale)
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

export default async function AlbumPage({ params, searchParams }: AlbumPageProps) {
  const [{ id }, locale, resolvedSearchParams] = await Promise.all([params, getRequestLocale(), searchParams]);
  const result = await loadAlbum(id);
  const album = result.album;
  const creditOptions = {
    albumCode: album.code,
    linkProfiles: album.labelSlug === PARIGO_LABEL_ID,
  };
  const composerCredits = buildTrackCreditLinks(album.tracks, creditOptions);
  const contributorGroups = buildAlbumContributorGroups(album.tracks, creditOptions);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "MusicAlbum",
    name: album.title,
    url: absoluteUrl(`${locale === "en" ? "/en" : ""}/albums/${id}`),
    image: absoluteUrl(album.cover),
    description: resolveAlbumDescription(album, locale),
    datePublished: album.releaseDate,
    numTracks: album.trackCount,
    genre: album.genres,
    byArtist: album.artists?.map((artist) => ({ "@type": "MusicGroup", name: artist.name })),
    recordLabel: { "@type": "Organization", name: album.label },
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <BreadcrumbJsonLd locale={locale} items={[
        { name: locale === "fr" ? "Albums" : "Albums", path: "/albums" },
        { name: album.title, path: `/albums/${id}` },
      ]} />
      <AlbumDetailClient
        data={{ album, similarAlbums: result.similar, composerCredits, contributorGroups }}
        initialTrackId={typeof resolvedSearchParams.track === "string" ? resolvedSearchParams.track : undefined}
        initialTrackTab={resolvedSearchParams.panel === "lyrics" ? "lyrics" : undefined}
        initialHighlight={typeof resolvedSearchParams.highlight === "string" ? resolvedSearchParams.highlight.slice(0, 200) : undefined}
      />
    </>
  );
}
