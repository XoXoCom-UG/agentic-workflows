import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

// Served at /robots.txt. Allows all crawlers, blocks the form API and the authenticated
// admin area, and points to the sitemap so search engines discover every route. Base URL
// is config-driven.
//
// /admin is belt-and-braces with the noindex metadata on app/admin/layout.tsx: robots.txt
// stops the crawl, the meta tag stops indexing of anything reached by a direct link.
// Note robots.txt is public, so this advertises that /admin exists — that is fine, it is
// password-protected, and the alternative (relying on obscurity) is not security.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
