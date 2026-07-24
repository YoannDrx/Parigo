import { CollectionsPageClient } from "@/components/catalog/CollectionsPageClient";
import { getCachedStyles } from "@/lib/harvest/catalog-cache";
import { getRequestLocale } from "@/lib/locale-server";
import { buildMetadata, hasSearchParams, type PageSearchParams } from "@/lib/seo";

export async function generateMetadata({ searchParams }: { searchParams: PageSearchParams }) {
  const [locale, filtered] = await Promise.all([getRequestLocale(), hasSearchParams(searchParams)]);
  return buildMetadata({ locale, path: "/collections", title: locale === "fr" ? "Collections musicales" : "Music collections", description: locale === "fr" ? "Explorez le catalogue Parigo Music par esthétique, époque et territoire musical." : "Explore the Parigo Music catalogue by style, period and musical territory.", index: !filtered, follow: true });
}

export default async function CollectionsPage() {
  return <CollectionsPageClient initialItems={await getCachedStyles()} />;
}
