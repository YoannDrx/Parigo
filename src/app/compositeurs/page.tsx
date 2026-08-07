import { permanentRedirect } from "next/navigation";
import { localizedPath } from "@/lib/locale";
import { getRequestLocale } from "@/lib/locale-server";
import type { PageSearchParams } from "@/lib/seo";

export default async function LegacyComposersPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const [locale, params] = await Promise.all([getRequestLocale(), searchParams]);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) query.append(key, item);
    }
  }
  const serializedQuery = query.toString();
  permanentRedirect(`${localizedPath(locale, "/talents")}${serializedQuery ? `?${serializedQuery}` : ""}`);
}
