import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SynchronisationDetailView } from "@/components/features/SynchronisationDetailView";
import { getSynchronisation, SYNCHRONISATIONS } from "@/content/synchronisations";
import { getRequestLocale } from "@/lib/locale-server";
import { buildMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { youtubeEmbedUrl } from "@/content/synchronisations";

export function generateStaticParams() {
  return SYNCHRONISATIONS.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const sync = getSynchronisation((await params).slug);
  if (!sync) return {};
  const locale = await getRequestLocale();
  return buildMetadata({ locale, path: `/synchronisations/${sync.slug}`, title: sync.title, description: locale === "fr" ? sync.descriptionFr : sync.descriptionEn, image: sync.image });
}

export default async function SynchronisationPage({ params }: { params: Promise<{ slug: string }> }) {
  const sync = getSynchronisation((await params).slug);
  if (!sync) notFound();
  return <><JsonLd data={{ "@context": "https://schema.org", "@type": "VideoObject", name: sync.title, description: sync.descriptionFr, thumbnailUrl: sync.image, embedUrl: youtubeEmbedUrl(sync.youtubeId) }} /><SynchronisationDetailView sync={sync} /></>;
}
