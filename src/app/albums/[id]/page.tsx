import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlbumDetailClient } from "@/components/catalog/AlbumDetailClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { PARIGO_LABEL_ID } from "@/config/catalog";
import { getCachedAlbum } from "@/lib/harvest/catalog-cache";
import { resolveAlbumDescription } from "@/lib/harvest/album-descriptions";
import { resolveCanonicalComposerCredits } from "@/lib/composers/profiles";
import { rethrowCatalogError } from "@/lib/harvest/route-errors";
import { getRequestLocale } from "@/lib/locale-server";
import { absoluteUrl, buildMetadata } from "@/lib/seo";
import type { ComposerCreditLink } from "@/types";

interface AlbumPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ track?: string | string[] }>;
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
  const composerCreditsByKey = new Map<string, ComposerCreditLink>();
  for (const credit of new Set(album.tracks.flatMap((track) => track.composers ?? []))) {
    const resolutions = album.labelSlug === PARIGO_LABEL_ID
      ? resolveCanonicalComposerCredits(credit, album.code)
      : [];
    if (!resolutions.length) {
      composerCreditsByKey.set(`credit:${credit}`, {
        credit,
        name: credit,
        href: `/search?view=tracks&type=main&composer=${encodeURIComponent(credit)}`,
      });
      continue;
    }
    for (const { profile } of resolutions) {
      composerCreditsByKey.set(`profile:${profile.slug}`, {
        credit,
        name: profile.name,
        slug: profile.slug,
        href: `/compositeurs/${profile.slug}`,
      });
    }
  }
  const composerCredits: ComposerCreditLink[] = [...composerCreditsByKey.values()];
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
      <AlbumDetailClient
        data={{ album, similarAlbums: result.similar, composerCredits }}
        initialTrackId={typeof resolvedSearchParams.track === "string" ? resolvedSearchParams.track : undefined}
      />
    </>
  );
}
