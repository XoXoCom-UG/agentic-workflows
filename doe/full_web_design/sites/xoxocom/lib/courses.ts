import { COPY, type CourseEntry, type Lang } from "@/lib/copy";

/**
 * Course lookup helpers.
 *
 * Course content lives in the bilingual tree (`COPY[lang].courses.catalog`) so it
 * follows the language toggle like every other string on the site. What does NOT
 * belong to a language is the slug: it is the URL. If the German and English entries
 * ever disagreed on it, `/courses/<slug>` would resolve for one language and 404 for
 * the other — a bug that only shows up after a toggle, i.e. the kind nobody catches.
 * `COURSE_SLUGS` below is derived from the German tree and checked against the English
 * one at module load, so that mistake throws at build time instead.
 */

const deCatalog = COPY.de.courses.catalog;
const enCatalog = COPY.en.courses.catalog;

if (deCatalog.length !== enCatalog.length) {
  throw new Error(
    `courses: catalog length differs between languages (de=${deCatalog.length}, en=${enCatalog.length})`,
  );
}
for (let i = 0; i < deCatalog.length; i++) {
  if (deCatalog[i].slug !== enCatalog[i].slug) {
    throw new Error(
      `courses: slug mismatch at index ${i} — de="${deCatalog[i].slug}" vs en="${enCatalog[i].slug}". ` +
        "The slug is the URL and must be identical in both language trees.",
    );
  }
}

/** Every course slug, in catalog order. Drives generateStaticParams and the sitemap. */
export const COURSE_SLUGS: string[] = deCatalog.map((c) => c.slug);

/** The catalog in the requested language, in display order. */
export function listCourses(lang: Lang): CourseEntry[] {
  return COPY[lang].courses.catalog;
}

/** One course, or undefined when the slug is unknown (→ the route calls notFound()). */
export function getCourse(lang: Lang, slug: string): CourseEntry | undefined {
  return COPY[lang].courses.catalog.find((c) => c.slug === slug);
}
