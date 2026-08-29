import { localizedPath } from "@/lib/locale";
import { absoluteUrl } from "@/lib/seo";
import { JsonLd } from "./JsonLd";

export function BreadcrumbJsonLd({
  locale,
  items,
}: {
  locale: "fr" | "en";
  items: Array<{ name: string; path: string }>;
}) {
  return <JsonLd data={{
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(localizedPath(locale, item.path)),
    })),
  }} />;
}
