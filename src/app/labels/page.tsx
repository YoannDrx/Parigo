import { LabelsPageClient } from "@/components/catalog/LabelsPageClient";
import { getCachedLabels } from "@/lib/harvest/catalog-cache";
import { getRequestLocale } from "@/lib/locale-server";
import { buildMetadata, hasSearchParams, type PageSearchParams } from "@/lib/seo";

export async function generateMetadata({ searchParams }: { searchParams: PageSearchParams }) {
  const [locale, filtered] = await Promise.all([getRequestLocale(), hasSearchParams(searchParams)]);
  return buildMetadata({ locale, path: "/labels", title: locale === "fr" ? "Labels partenaires" : "Partner labels", description: locale === "fr" ? "Découvrez les labels et maisons de production musicale réunis dans le catalogue Parigo Music." : "Discover the labels and production music companies represented in the Parigo Music catalogue.", index: !filtered, follow: true });
}

export default async function LabelsPage() {
  const labels = await getCachedLabels();
  return <LabelsPageClient labels={labels.map((label) => ({ ...label, slug: label.slug || label.id, description: label.description || null, website: label.website || null }))} />;
}
