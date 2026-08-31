import { LabelsPageClient } from "@/components/catalog/LabelsPageClient";
import { PARIGO_LABEL_ID } from "@/config/catalog";
import { getCachedLabels } from "@/lib/harvest/catalog-cache";
import { localizeLabel } from "@/lib/catalog-localization";
import { getRequestLocale } from "@/lib/locale-server";
import { buildMetadata, hasSearchParams, type PageSearchParams } from "@/lib/seo";

export async function generateMetadata({ searchParams }: { searchParams: PageSearchParams }) {
  const [locale, filtered] = await Promise.all([getRequestLocale(), hasSearchParams(searchParams)]);
  return buildMetadata({ locale, path: "/labels", title: "Labels", description: locale === "fr" ? "Découvrez les labels et maisons de production musicale réunis dans le catalogue Parigo Music." : "Discover the labels and production music companies available in the Parigo Music catalogue.", index: !filtered, follow: true });
}

export default async function LabelsPage() {
  const [labels, locale] = await Promise.all([getCachedLabels(), getRequestLocale()]);
  return <LabelsPageClient labels={labels.filter((source) => source.id !== PARIGO_LABEL_ID).map((source) => {
    const label = localizeLabel(source, locale);
    return { ...label, slug: label.slug || label.id, description: label.description || null, website: label.website || null };
  })} />;
}
