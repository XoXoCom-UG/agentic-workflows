import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

// Public, indexable routes. Legal pages are included (lower priority) so search engines
// can reach them; /thank-you is intentionally omitted (post-conversion, noindex). URLs
// derive from SITE_URL (config-driven). Served at /sitemap.xml.
const ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/impressum", priority: 0.2, changeFrequency: "yearly" },
  { path: "/datenschutz", priority: 0.2, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
