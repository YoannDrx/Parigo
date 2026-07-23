import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LabelDetailClient } from "@/components/catalog/LabelDetailClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCachedAlbums, getCachedLabel } from "@/lib/harvest/catalog-cache";
import { getRequestLocale } from "@/lib/locale-server";
import { absoluteUrl, buildMetadata } from "@/lib/seo";

interface LabelPageProps {
  params: Promise<{ slug: string }>;
}

async function loadLabel(slug: string) {
  const [label, albums] = await Promise.all([
    getCachedLabel(slug),
    getCachedAlbums({ label: slug, limit: 100 }),
  ]);
  if (!label) notFound();
  return {
    ...label,
    slug: label.slug || label.id,
    description: label.description || null,
    website: label.website || null,
    albumCount: albums.total,
    trackCount: albums.items.reduce((total, album) => total + album.trackCount, 0),
    albums: albums.items,
  };
}

export async function generateMetadata({ params }: LabelPageProps): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getRequestLocale()]);
  const label = await loadLabel(slug);
  return buildMetadata({
    locale,
    path: `/labels/${slug}`,
    title: label.name,
    description: label.description || (locale === "fr"
      ? `Découvrez les albums du label ${label.name} dans le catalogue Parigo Music.`
      : `Discover releases from ${label.name} in the Parigo Music catalogue.`),
    image: label.logo,
  });
}

export default async function LabelPage({ params }: LabelPageProps) {
  const [{ slug }, locale] = await Promise.all([params, getRequestLocale()]);
  const label = await loadLabel(slug);
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: label.name,
        url: absoluteUrl(`${locale === "en" ? "/en" : ""}/labels/${slug}`),
        logo: label.logo ? absoluteUrl(label.logo) : undefined,
        description: label.description || undefined,
      }} />
      <LabelDetailClient label={label} />
    </>
  );
}
