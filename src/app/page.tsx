import { HomeExperience } from "@/components/home/HomeExperience";
import { staticMetadata } from "@/lib/seo-server";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_URL, siteConfig } from "@/lib/seo";
import { getCachedPlaylists } from "@/lib/harvest/catalog-cache";

export const generateMetadata = staticMetadata("/", {
  fr: { title: "Musique de production pour l’image", description: "Parigo Music accompagne films, séries, publicités et contenus de marque avec une sélection musicale exigeante et un licensing clair." },
  en: { title: "Production music for moving images", description: "Parigo Music supports film, television, advertising and branded content with expert music curation and clear licensing." },
});

export default async function HomePage() {
  const playlists = await getCachedPlaylists({ limit: 12 });
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
    <HomeExperience initialPlaylists={initialPlaylists} />
  </>;
}
