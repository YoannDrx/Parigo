import { PlaylistsPageClient } from "@/components/catalog/PlaylistsPageClient";
import { getCachedPlaylistDiscovery } from "@/lib/harvest/catalog-cache";
import { getRequestLocale } from "@/lib/locale-server";
import { buildMetadata, hasSearchParams, type PageSearchParams } from "@/lib/seo";

export async function generateMetadata({ searchParams }: { searchParams: PageSearchParams }) {
  const [locale, filtered] = await Promise.all([getRequestLocale(), hasSearchParams(searchParams)]);
  return buildMetadata({ locale, path: "/playlists", title: locale === "fr" ? "Playlists éditoriales" : "Editorial playlists", description: locale === "fr" ? "Écoutez les playlists éditoriales Parigo Music, pensées pour les films, séries, publicités et contenus de marque." : "Listen to Parigo Music editorial playlists curated for film, television, advertising and branded content.", index: !filtered, follow: true });
}

export default async function PlaylistsPage() {
  const playlists = await getCachedPlaylistDiscovery();
  return <PlaylistsPageClient playlists={playlists.map((playlist) => ({ ...playlist, slug: playlist.slug || playlist.id, description: playlist.description || null, cover: playlist.cover || null, trackCount: playlist.trackCount || 0, category: playlist.category || null, isFeatured: playlist.isFeatured ?? true }))} />;
}
