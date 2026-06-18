import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

// Public, indexable routes. Legal pages are included (lower priority) so search engines
// can reach them. URLs derive from SITE_URL (config-driven). Served at /sitemap.xml.
const ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/produkte", priority: 0.8, changeFrequency: "monthly" },
  { path: "/leistungen/ai-transformation", priority: 0.8, changeFrequency: "monthly" },
  { path: "/leistungen/expert-consulting", priority: 0.8, changeFrequency: "monthly" },
  { path: "/leistungen/business-coaching", priority: 0.8, changeFrequency: "monthly" },
  { path: "/ueber-uns", priority: 0.7, changeFrequency: "monthly" },
  { path: "/kontakt", priority: 0.7, changeFrequency: "monthly" },
  { path: "/impressum", priority: 0.2, changeFrequency: "yearly" },
  { path: "/datenschutz", priority: 0.2, changeFrequency: "yearly" },
  { path: "/agb", priority: 0.2, changeFrequency: "yearly" },
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
