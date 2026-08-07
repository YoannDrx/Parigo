import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CatalogHero } from "@/components/catalog/CatalogHero";
import { ClipCard } from "@/components/editorial/ClipCard";
import { Footer, Header } from "@/components/layout";
import { getEditorialVideos } from "@/lib/editorial/videos";
import type { EditorialVideo } from "@/lib/editorial/video-types";
import { localizedPath } from "@/lib/locale";
import { getRequestLocale } from "@/lib/locale-server";
import { buildMetadata, hasSearchParams, type PageSearchParams } from "@/lib/seo";

interface ClipsPageProps {
  searchParams: PageSearchParams;
}

export async function generateMetadata({ searchParams }: ClipsPageProps): Promise<Metadata> {
  const [locale, filtered] = await Promise.all([getRequestLocale(), hasSearchParams(searchParams)]);
  return buildMetadata({
    locale,
    path: "/clips",
    title: "Clips",
    description: locale === "fr"
      ? "Découvrez les clips, making-of, performances et archives vidéo de Parigo."
      : "Discover Parigo music videos, behind-the-scenes films, performances and archives.",
    index: !filtered,
  });
}

export default async function ClipsPage({ searchParams }: ClipsPageProps) {
  const [locale, params, videos] = await Promise.all([
    getRequestLocale(),
    searchParams,
    getEditorialVideos(),
  ]);
  if (Object.keys(params).length > 0) redirect(localizedPath(locale, "/clips"));

  return (
    <div className="page-shell min-h-screen">
      <Header />
      <main>
        <CatalogHero
          title="Clips"
          intro={locale === "fr"
            ? "Clips officiels, making-of, performances et archives issus de la playlist YouTube Parigo. Les relations avec les compositeurs sont validées éditorialement."
            : "Official videos, behind-the-scenes films, performances and archives from the Parigo YouTube playlist. Composer relationships are editorially verified."}
          meta={`${videos.length} ${locale === "fr" ? "vidéos publiques" : "public videos"}`}
        />
        <section className="mx-auto max-w-[1500px] px-4 py-14 sm:px-6 lg:px-8 md:py-20">
          <div className="grid gap-5 md:grid-cols-2">
              {videos.map((clip: EditorialVideo) => (
                <ClipCard
                  key={clip.slug}
                  clip={clip}
                  locale={locale}
                />
              ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
