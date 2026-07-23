import { CollectionsPageClient } from "@/components/catalog/CollectionsPageClient";
import { getCachedStyles } from "@/lib/harvest/catalog-cache";
import { getRequestLocale } from "@/lib/locale-server";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await getRequestLocale();
  return buildMetadata({ locale, path: "/collections", title: locale === "fr" ? "Collections musicales" : "Music collections", description: locale === "fr" ? "Explorez le catalogue Parigo Music par esthétique, époque et territoire musical." : "Explore the Parigo Music catalogue by style, period and musical territory." });
}

export default async function CollectionsPage() {
  return <CollectionsPageClient initialItems={await getCachedStyles()} />;
}
