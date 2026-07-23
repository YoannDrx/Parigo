import { SynchronisationsExperience } from "@/components/features/SynchronisationsExperience";
import { staticMetadata } from "@/lib/seo-server";

export const generateMetadata = staticMetadata("/synchronisations", {
  fr: { title: "Nos synchronisations", description: "Découvrez une sélection de films, séries et campagnes mis en musique avec le catalogue Parigo." },
  en: { title: "Our sync placements", description: "Discover films, series and campaigns featuring music from the Parigo catalogue." },
});

export default function SynchronisationsPage() {
  return <SynchronisationsExperience />;
}
