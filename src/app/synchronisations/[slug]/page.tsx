import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SynchronisationDetailView } from "@/components/features/SynchronisationDetailView";
import { getSynchronisation, SYNCHRONISATIONS } from "@/content/synchronisations";

export function generateStaticParams() {
  return SYNCHRONISATIONS.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const sync = getSynchronisation((await params).slug);
  if (!sync) return {};
  return { title: sync.title, description: sync.descriptionFr, openGraph: { images: [sync.image] } };
}

export default async function SynchronisationPage({ params }: { params: Promise<{ slug: string }> }) {
  const sync = getSynchronisation((await params).slug);
  if (!sync) notFound();
  return <SynchronisationDetailView sync={sync} />;
}
