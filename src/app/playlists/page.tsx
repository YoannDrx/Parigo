import { PlaylistsPageClient } from "@/components/catalog/PlaylistsPageClient";
import { getCachedPlaylistDiscovery } from "@/lib/harvest/catalog-cache";
import { getRequestLocale } from "@/lib/locale-server";
import { buildMetadata, hasSearchParams, type PageSearchParams } from "@/lib/seo";
import { localizePlaylist } from "@/lib/catalog-localization";

export async function generateMetadata({ searchParams }: { searchParams: PageSearchParams }) {
  const [locale, filtered] = await Promise.all([getRequestLocale(), hasSearchParams(searchParams)]);
  return buildMetadata({ locale, path: "/playlists", title: locale === "fr" ? "Nos playlists" : "Our playlists", description: locale === "fr" ? "Écoutez les playlists éditoriales Parigo Music, pensées pour les films, séries, publicités et contenus de marque." : "Listen to Parigo Music editorial playlists curated for film, television, advertising and branded content.", index: !filtered, follow: true });
}

export default async function PlaylistsPage() {
  const [playlists, locale] = await Promise.all([getCachedPlaylistDiscovery(), getRequestLocale()]);
  return <PlaylistsPageClient playlists={playlists.map((source) => {
    const playlist = localizePlaylist(source, locale);
    return {
      id: playlist.id,
      slug: playlist.slug || playlist.id,
      title: playlist.title,
      description: playlist.description || null,
      cover: playlist.cover || null,
      trackCount: playlist.trackCount || 0,
      category: playlist.category || null,
      isFeatured: playlist.isFeatured ?? true,
      genres: playlist.genres,
      moods: playlist.moods,
      instruments: playlist.instruments,
      musicFor: playlist.musicFor,
    };
  })} />;
}
