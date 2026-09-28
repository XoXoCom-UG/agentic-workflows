import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";
import { listPublishedForSitemap } from "@/lib/blog";
import { COURSE_SLUGS } from "@/lib/courses";
import { COURSES_ENABLED } from "@/lib/features";

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
  // Only the bare index. Filtered views (?tags=, ?lang=) are noindex with canonical
  // /blog, so listing them would advertise pages we ask crawlers to ignore.
  { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
  // Courses are parked (lib/features.ts) — keep them out of the sitemap until relaunch.
  ...(COURSES_ENABLED
    ? [
        { path: "/courses", priority: 0.8, changeFrequency: "monthly" as const },
        // Course detail pages come from the catalog in lib/copy.ts — a compile-time constant,
        // so unlike the blog posts appended further down they need no database round-trip and
        // cannot fail at request time.
        ...COURSE_SLUGS.map((slug) => ({
          path: `/courses/${slug}`,
          priority: 0.8,
          changeFrequency: "monthly" as const,
        })),
      ]
    : []),
  { path: "/impressum", priority: 0.2, changeFrequency: "yearly" },
  { path: "/datenschutz", priority: 0.2, changeFrequency: "yearly" },
  { path: "/agb", priority: 0.2, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes = ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  // Blog posts are appended from the database. listPublishedForSitemap already
  // swallows its own errors and returns [], but the try/catch stays as a second
  // guard: score_seo.py treats a missing or non-200 /sitemap.xml as a HARD GATE
  // that reverts the entire optimizer tree, and search engines lose the whole map.
  // Degrading to the ten static routes is always better than failing the response.
  let posts: { slug: string; updatedAt: string }[] = [];
  try {
    posts = await listPublishedForSitemap();
  } catch (err) {
    console.error("[sitemap] blog query failed; serving static routes only", err);
  }

  return staticRoutes.concat(
    posts.map(({ slug, updatedAt }) => ({
      url: `${SITE_URL}/blog/${slug}`,
      lastModified: new Date(updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  );
}
