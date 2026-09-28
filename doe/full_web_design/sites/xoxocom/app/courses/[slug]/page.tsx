import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CourseDetailContent from "@/components/content/CourseDetailContent";
import { getCourse } from "@/lib/courses";
import { COURSES_ENABLED } from "@/lib/features";
import { buildMetadata } from "@/lib/seo";
import { getCopy } from "@/lib/server-copy";

/**
 * One course.
 *
 * Deliberately NO generateStaticParams, matching /blog/[slug]. The catalog IS a
 * compile-time constant, so prerendering looks free — but the page resolves its
 * language through getCopy(), which reads cookies(), and that opts the route into
 * dynamic rendering regardless. A generateStaticParams here would prerender nothing
 * and only read as though it did.
 *
 * generateMetadata calls notFound() for an unknown slug rather than leaving it to the
 * page: otherwise Next renders metadata for a page that then 404s, and a correct-looking
 * <title> on a 404 is precisely the soft-404 signal score_seo.py treats as a hard gate.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  // Parked: 404 until relaunch (lib/features.ts).
  if (!COURSES_ENABLED) notFound();
  const [{ lang }, { slug }] = await Promise.all([getCopy(), params]);
  const course = getCourse(lang, slug);
  if (!course) notFound();

  return buildMetadata({
    title: course.metaTitle,
    description: course.metaDescription,
    path: `/courses/${course.slug}`,
  });
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  if (!COURSES_ENABLED) notFound();
  const { slug } = await params;
  return <CourseDetailContent slug={slug} />;
}
