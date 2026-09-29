/**
 * Site feature flags.
 *
 * COURSES_ENABLED — the whole /courses section (nav link, index + detail pages, sitemap
 * entries, /api/course-waitlist). Parked while no course is on offer: the code and copy
 * stay in the repo, but with the flag off every course route 404s and nothing links to
 * it. To relaunch, set this to true and redeploy — see directives/relaunch_courses.md.
 *
 * Lives in its own module (not lib/courses.ts) because lib/copy.ts reads it for the nav,
 * and lib/courses.ts imports lib/copy.ts — putting it there would be a circular import.
 */
export const COURSES_ENABLED = true;
