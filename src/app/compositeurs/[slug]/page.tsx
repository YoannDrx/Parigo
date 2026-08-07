import { permanentRedirect } from "next/navigation";
import { localizedPath } from "@/lib/locale";
import { getRequestLocale } from "@/lib/locale-server";

export default async function LegacyComposerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, locale] = await Promise.all([params, getRequestLocale()]);
  permanentRedirect(localizedPath(locale, `/talents/${slug}`));
}
