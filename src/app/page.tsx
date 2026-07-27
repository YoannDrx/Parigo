import { HomeExperience } from "@/components/home/HomeExperience";
import { staticMetadata } from "@/lib/seo-server";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_URL, siteConfig } from "@/lib/seo";
import { getCachedAlbumDiscovery, getCachedPlaylists } from "@/lib/harvest/catalog-cache";
import { getSynchronisations } from "@/lib/youtube/synchronisations";
import { getFeaturedEditorialVideos } from "@/lib/editorial/videos";
import { PARIGO_LABEL_ID } from "@/config/catalog";

export const generateMetadata = staticMetadata("/", {
  fr: { title: "Musique de production pour l’image", description: "Parigo Music accompagne films, séries, publicités et contenus de marque avec une sélection musicale exigeante et un licensing clair." },
  en: { title: "Production music for moving images", description: "Parigo Music supports film, television, advertising and branded content with expert music curation and clear licensing." },
});

export default async function HomePage() {
  const [playlists, parigoAlbums, synchronisations, clips] = await Promise.all([
    getCachedPlaylists({ limit: 12 }),
    getCachedAlbumDiscovery({ label: PARIGO_LABEL_ID, limit: 100, sort: "releaseDate" }),
    getSynchronisations(),
    getFeaturedEditorialVideos(8),
  ]);
  const manifestoAlbumCovers = Array.from(
    new Map(
      parigoAlbums.items
        .filter((album) => album.cover && !album.cover.includes("placeholder"))
        .map((album) => [album.cover, { src: album.cover, title: album.title }]),
    ).values(),
  );
  const initialPlaylists = {
    playlists: playlists.items,
    pagination: {
      total: playlists.total,
      limit: playlists.pageSize,
      offset: 0,
      hasMore: playlists.items.length < playlists.total,
    },
  };

  return <>
    <JsonLd data={[
      { "@context": "https://schema.org", "@type": "Organization", name: siteConfig.name, url: SITE_URL, email: siteConfig.email },
      { "@context": "https://schema.org", "@type": "WebSite", name: siteConfig.name, url: SITE_URL, inLanguage: ["fr", "en"] },
    ]} />
    <HomeExperience
      initialPlaylists={initialPlaylists}
      initialParigoAlbums={parigoAlbums.items.slice(0, 12)}
      manifestoAlbumCovers={manifestoAlbumCovers}
      initialSynchronisations={synchronisations.slice(0, 12)}
      initialClips={clips}
    />
  </>;
}
