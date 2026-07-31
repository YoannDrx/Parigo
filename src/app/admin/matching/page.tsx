import type { Metadata } from "next";
import { MatchingDashboard } from "@/components/admin/MatchingDashboard";
import { getMatchingDashboardData } from "@/lib/matching/aggregate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contrôle des relations",
  description: "Dashboard interne Parigo de vérification des relations compositeurs, albums, vinyles et clips.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default async function AdminMatchingPage() {
  const data = await getMatchingDashboardData();
  return <MatchingDashboard data={data} />;
}
