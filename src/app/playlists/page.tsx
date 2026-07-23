import { PlaylistsPageClient } from "@/components/catalog/PlaylistsPageClient";
import { getCachedPlaylists } from "@/lib/harvest/catalog-cache";
import { getRequestLocale } from "@/lib/locale-server";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await getRequestLocale();
  return buildMetadata({ locale, path: "/playlists", title: locale === "fr" ? "Playlists éditoriales" : "Editorial playlists", description: locale === "fr" ? "Écoutez les playlists éditoriales Parigo Music, pensées pour les films, séries, publicités et contenus de marque." : "Listen to Parigo Music editorial playlists curated for film, television, advertising and branded content." });
}

export default async function PlaylistsPage() {
  const result = await getCachedPlaylists({ limit: 100 });
  return <PlaylistsPageClient playlists={result.items.map((playlist) => ({ ...playlist, slug: playlist.slug || playlist.id, description: playlist.description || null, cover: playlist.cover || null, trackCount: playlist.trackCount || 0, category: playlist.category || null, isFeatured: playlist.isFeatured ?? true }))} />;
}
