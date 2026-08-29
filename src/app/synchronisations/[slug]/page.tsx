import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SynchronisationDetailView } from "@/components/features/SynchronisationDetailView";
import { getSynchronisation, getSynchronisations } from "@/lib/youtube/synchronisations";
import { getRequestLocale } from "@/lib/locale-server";
import { buildMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { youtubeEmbedUrl } from "@/lib/youtube/synchronisation-types";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const sync = await getSynchronisation((await params).slug);
  if (!sync) return {};
  const locale = await getRequestLocale();
  return buildMetadata({ locale, path: `/synchronisations/${sync.slug}`, title: sync.title, description: locale === "fr" ? sync.descriptionFr : sync.descriptionEn, image: sync.image });
}

export default async function SynchronisationPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, locale, synchronisations] = await Promise.all([params, getRequestLocale(), getSynchronisations()]);
  const sync = synchronisations.find((item) => item.slug === slug || item.youtubeId === slug);
  if (!sync) notFound();
  return <>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "VideoObject", name: sync.title, description: locale === "fr" ? sync.descriptionFr : sync.descriptionEn, thumbnailUrl: sync.image, embedUrl: youtubeEmbedUrl(sync.youtubeId) }} />
    <BreadcrumbJsonLd locale={locale} items={[
      { name: locale === "fr" ? "Synchronisations" : "Synchronisations", path: "/synchronisations" },
      { name: sync.title, path: `/synchronisations/${sync.slug}` },
    ]} />
    <SynchronisationDetailView sync={sync} />
  </>;
}
