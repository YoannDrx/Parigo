import type { Metadata } from "next";
import { SynchronisationsExperience } from "@/components/features/SynchronisationsExperience";

export const metadata: Metadata = {
  title: "Nos synchronisations",
  description: "Découvrez une sélection de films, séries et campagnes mis en musique avec le catalogue Parigo.",
};

export default function SynchronisationsPage() {
  return <SynchronisationsExperience />;
}
