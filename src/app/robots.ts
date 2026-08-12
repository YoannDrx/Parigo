import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/account/",
        "/en/account/",
        "/change-password/",
        "/reset-password/",
        "/engage-playlist/",
        "/presentation-parigo/",
        "/en/presentation-parigo/",
        "/moods-photos/",
        "/en/moods-photos/",
        "/shared-playlistcategory/",
        "/verify-member/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
