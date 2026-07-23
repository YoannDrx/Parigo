import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/account/", "/en/account/", "/design-system", "/engage-playlist/", "/verify-member/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
