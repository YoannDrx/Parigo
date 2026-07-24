import { SynchronisationsExperience } from "@/components/features/SynchronisationsExperience";
import { getSynchronisations } from "@/lib/youtube/synchronisations";
import { getRequestLocale } from "@/lib/locale-server";
import { buildMetadata, hasSearchParams, type PageSearchParams } from "@/lib/seo";

export async function generateMetadata({ searchParams }: { searchParams: PageSearchParams }) {
  const [locale, filtered] = await Promise.all([getRequestLocale(), hasSearchParams(searchParams)]);
  return buildMetadata({
    locale,
    path: "/synchronisations",
    title: locale === "fr" ? "Nos synchronisations" : "Our sync placements",
    description: locale === "fr"
      ? "Découvrez une sélection de films, séries et campagnes mis en musique avec le catalogue Parigo."
      : "Discover films, series and campaigns featuring music from the Parigo catalogue.",
    index: !filtered,
    follow: true,
  });
}

export default async function SynchronisationsPage() {
  return <SynchronisationsExperience synchronisations={await getSynchronisations()} />;
}
