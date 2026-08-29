import type { Metadata } from "next";
import { PlaylistDetailClient } from "@/components/catalog/PlaylistDetailClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { getCachedPlaylist } from "@/lib/harvest/catalog-cache";
import { rethrowCatalogError } from "@/lib/harvest/route-errors";
import { getRequestLocale } from "@/lib/locale-server";
import { absoluteUrl, buildMetadata } from "@/lib/seo";
import { localizePlaylist } from "@/lib/catalog-localization";

interface PlaylistPageProps {
  params: Promise<{ slug: string }>;
}

async function loadPlaylist(slug: string, locale: "fr" | "en") {
  try {
    const playlist = localizePlaylist(await getCachedPlaylist(slug), locale);
    return {
      ...playlist,
      totalDuration: playlist.tracks.reduce((sum, track) => sum + track.duration, 0),
    };
  } catch (error) {
    rethrowCatalogError(error);
  }
}

export async function generateMetadata({ params }: PlaylistPageProps): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getRequestLocale()]);
  const playlist = await loadPlaylist(slug, locale);
  return buildMetadata({
    locale,
    path: `/playlists/${slug}`,
    title: playlist.title,
    description: playlist.description || (locale === "fr"
      ? `Écoutez la sélection éditoriale ${playlist.title} de Parigo Music.`
      : `Listen to Parigo Music's ${playlist.title} editorial selection.`),
    image: playlist.cover,
  });
}

export default async function PlaylistPage({ params }: PlaylistPageProps) {
  const [{ slug }, locale] = await Promise.all([params, getRequestLocale()]);
  const playlist = await loadPlaylist(slug, locale);
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "MusicPlaylist",
        name: playlist.title,
        url: absoluteUrl(`${locale === "en" ? "/en" : ""}/playlists/${slug}`),
        image: absoluteUrl(playlist.cover),
        description: playlist.description,
        numTracks: playlist.trackCount,
        track: playlist.tracks.map((track, position) => ({
          "@type": "ListItem",
          position: position + 1,
          item: { "@type": "MusicRecording", name: track.title },
        })),
      }} />
      <BreadcrumbJsonLd locale={locale} items={[
        { name: locale === "fr" ? "Playlists" : "Playlists", path: "/playlists" },
        { name: playlist.title, path: `/playlists/${slug}` },
      ]} />
      <PlaylistDetailClient playlist={playlist} />
    </>
  );
}
