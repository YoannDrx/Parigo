import { Suspense } from "react";
import { HomeExperience, HomeHero } from "@/components/home/HomeExperience";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
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

function loadHomeData() {
  return Promise.all([
    getCachedPlaylists({ limit: 12 }),
    getCachedAlbumDiscovery({ limit: 12, sort: "releaseDate" }),
    getCachedAlbumDiscovery({ label: PARIGO_LABEL_ID, limit: 12, sort: "releaseDate" }),
    getSynchronisations(),
    getFeaturedEditorialVideos(8),
  ]);
}

async function HomeDataSections({ dataPromise }: { dataPromise: ReturnType<typeof loadHomeData> }) {
  const [playlists, releases, parigoAlbums, synchronisations, clips] = await dataPromise;
  const initialPlaylists = {
    playlists: playlists.items,
    pagination: {
      total: playlists.total,
      limit: playlists.pageSize,
      offset: 0,
      hasMore: playlists.items.length < playlists.total,
    },
  };

  return (
    <HomeExperience
      initialPlaylists={initialPlaylists}
      initialReleases={releases.items}
      initialParigoAlbums={parigoAlbums.items}
      initialSynchronisations={synchronisations.slice(0, 12)}
      initialClips={clips}
    />
  );
}

export default function HomePage() {
  const dataPromise = loadHomeData();

  return (
    <>
      <JsonLd data={[
        { "@context": "https://schema.org", "@type": "Organization", name: siteConfig.name, url: SITE_URL, email: siteConfig.email },
        { "@context": "https://schema.org", "@type": "WebSite", name: siteConfig.name, url: SITE_URL, inLanguage: ["fr", "en"] },
      ]} />
      <div className="page-shell home-shell">
        <Header variant="overlay" />
        <main>
          <HomeHero />
          <Suspense fallback={<div className="min-h-[40vh]" aria-hidden="true" />}>
            <HomeDataSections dataPromise={dataPromise} />
          </Suspense>
        </main>
        <Footer />
      </div>
    </>
  );
}
