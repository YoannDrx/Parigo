import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LabelDetailClient } from "@/components/catalog/LabelDetailClient";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCachedAlbumDiscovery, getCachedLabel } from "@/lib/harvest/catalog-cache";
import { getRequestLocale } from "@/lib/locale-server";
import { absoluteUrl, buildMetadata, hasSearchParams, type PageSearchParams } from "@/lib/seo";

interface LabelPageProps {
  params: Promise<{ slug: string }>;
  searchParams: PageSearchParams;
}

async function loadLabel(slug: string, locale: "fr" | "en") {
  const [label, albums] = await Promise.all([
    getCachedLabel(slug),
    getCachedAlbumDiscovery({ label: slug, limit: 30, sort: "recent" }),
  ]);
  if (!label) notFound();
  return {
    ...label,
    slug: label.slug || label.id,
    description: label.descriptions?.[locale] || label.description || null,
    website: label.website || null,
    albumCount: albums.total,
    trackCount: label.trackCount ?? 0,
    albums: {
      albums: albums.items,
      facets: albums.facets,
      pagination: {
        total: albums.total,
        limit: albums.pageSize,
        offset: 0,
        hasMore: albums.items.length < albums.total,
      },
    },
  };
}

export async function generateMetadata({ params, searchParams }: LabelPageProps): Promise<Metadata> {
  const [{ slug }, locale, filtered] = await Promise.all([params, getRequestLocale(), hasSearchParams(searchParams)]);
  const label = await loadLabel(slug, locale);
  return buildMetadata({
    locale,
    path: `/labels/${slug}`,
    title: label.name,
    description: label.description || (locale === "fr"
      ? `Découvrez les albums du label ${label.name} dans le catalogue Parigo Music.`
      : `Discover releases from ${label.name} in the Parigo Music catalogue.`),
    index: !filtered,
    follow: true,
  });
}

export default async function LabelPage({ params }: LabelPageProps) {
  const [{ slug }, locale] = await Promise.all([params, getRequestLocale()]);
  const label = await loadLabel(slug, locale);
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: label.name,
        url: absoluteUrl(`${locale === "en" ? "/en" : ""}/labels/${slug}`),
        description: label.description || undefined,
      }} />
      <ReactQueryProvider><LabelDetailClient label={label} /></ReactQueryProvider>
    </>
  );
}
