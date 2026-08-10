import type { Metadata } from "next";
import { Suspense } from "react";

import BlogIndexSkeleton from "@/components/blog/BlogIndexSkeleton";
import BlogIndexContent, {
  type BlogSearchParams,
} from "@/components/content/BlogIndexContent";
import { buildMetadata } from "@/lib/seo";
import { getCopy } from "@/lib/server-copy";

/**
 * Metadata is generated rather than static because a filtered view must not be
 * indexed: ?tags= and ?lang= produce near-duplicate pages with no unique content,
 * which is the faceted-navigation trap that burns crawl budget and trips the
 * scorer's title_unique / desc_unique checks. Canonical always points at bare
 * /blog so the crawler consolidates on one URL; follow stays on so article links
 * are still discovered.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<BlogSearchParams>;
}): Promise<Metadata> {
  const [{ c }, sp] = await Promise.all([getCopy(), searchParams]);
  const filtered = Boolean(sp.tags || sp.lang);

  return buildMetadata({
    title: c.blog.metaTitle,
    description: c.blog.metaDescription,
    path: "/blog",
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  });
}

/**
 * DO NOT add an app/blog/loading.tsx.
 *
 * A segment-level loading.tsx is inherited by child segments, so it would wrap
 * /blog/[slug] in a Suspense boundary too. Once a Suspense fallback renders, the
 * response body has started streaming and the HTTP status is locked — notFound()
 * in the article route would then render the 404 page with a 200 status, i.e. a
 * soft 404. This was measured, not theorised: adding the two loading.tsx files
 * turned /blog/<unknown> from 404 into 200, and deleting them restored it.
 *
 * The skeleton therefore lives in a <Suspense> here instead, which is scoped to
 * this route alone. /blog never calls notFound(), so streaming costs it nothing.
 * See the "Status Codes" section of the Next.js loading.js docs.
 */
export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<BlogSearchParams>;
}) {
  const sp = await searchParams;
  return (
    <Suspense key={JSON.stringify(sp)} fallback={<BlogIndexSkeleton />}>
      <BlogIndexContent searchParams={sp} />
    </Suspense>
  );
}
