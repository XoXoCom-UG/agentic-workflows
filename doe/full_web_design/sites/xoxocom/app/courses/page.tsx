import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CoursesContent from "@/components/content/CoursesContent";
import { COURSES_ENABLED } from "@/lib/features";
import { buildMetadata } from "@/lib/seo";
import { getCopy } from "@/lib/server-copy";

// Generated rather than static so the title/description follow the language cookie,
// matching how /blog does it. Both strings are length- and uniqueness-checked per route
// by execution/autoresearch/score/score_seo.py.
export async function generateMetadata(): Promise<Metadata> {
  // Parked: 404 until relaunch (lib/features.ts).
  if (!COURSES_ENABLED) notFound();
  const { c } = await getCopy();
  return buildMetadata({
    title: c.courses.metaTitle,
    description: c.courses.metaDescription,
    path: "/courses",
  });
}

export default function CoursesPage() {
  if (!COURSES_ENABLED) notFound();
  return <CoursesContent />;
}
