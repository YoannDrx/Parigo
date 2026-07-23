import "server-only";

import { getRequestLocale } from "./locale-server";
import { buildMetadata } from "./seo";

export function staticMetadata(
  path: string,
  content: {
    fr: { title: string; description: string };
    en: { title: string; description: string };
  },
  options: { index?: boolean; follow?: boolean } = {},
) {
  return async function generateMetadata() {
    const locale = await getRequestLocale();
    return buildMetadata({
      locale,
      path,
      ...content[locale],
      index: options.index,
      follow: options.follow,
    });
  };
}
