import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

// Served at /robots.txt. Allows all crawlers, blocks the form API, and points to the
// sitemap so search engines discover every route. Base URL is config-driven.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
