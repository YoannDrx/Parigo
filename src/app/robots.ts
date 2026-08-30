import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/account/",
          "/en/account/",
          "/change-password/",
          "/reset-password/",
          "/engage-playlist/",
          "/shared-playlistcategory/",
          "/verify-member/",
        ],
      },
      {
        userAgent: ["ClaudeBot", "meta-externalagent"],
        disallow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
