import { getCopy } from "@/lib/server-copy";
import { listCourses } from "@/lib/courses";
import CourseCard from "@/components/courses/CourseCard";
import CourseCarousel from "@/components/courses/CourseCarousel";

/**
 * /courses — the catalog. Server component: the cards and all their copy render to HTML,
 * and the only JavaScript that ships is CourseCarousel's arrow logic.
 */
export default async function CoursesContent() {
  const { c, lang } = await getCopy();
  const t = c.courses;
  const courses = listCourses(lang);

  return (
    <main className="relative overflow-hidden px-6 md:px-10 lg:px-12 py-20 md:py-28">
      {/* Same coral atmosphere the home page uses for its feature section, so /courses
          reads as part of the site rather than as a bolted-on catalog. */}
      <div
        aria-hidden
        className="hue-breathe pointer-events-none absolute -left-32 top-10 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(251,107,76,0.14),transparent_70%)] blur-2xl"
      />
      <div
        aria-hidden
        style={{ animationDelay: "-3.5s" }}
        className="hue-breathe pointer-events-none absolute -right-24 top-1/2 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(251,107,76,0.10),transparent_70%)] blur-2xl"
      />

      <div className="relative mx-auto max-w-6xl">
        {/* Centred, like the home hero. The catalog starts at one course, and a lone
            card under a left-aligned header reads as a page that failed to load its
            other columns; centred, one card reads as a deliberate first release. */}
        <header className="mx-auto max-w-2xl space-y-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{t.eyebrow}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-fg">{t.title}</h1>
          <p className="text-lg text-muted">{t.sub}</p>
        </header>

        <div className="mt-12">
          <CourseCarousel ariaLabel={t.carouselAria} prevLabel={t.scrollPrev} nextLabel={t.scrollNext}>
            {courses.map((course) => (
              <div key={course.slug} className="w-[85vw] max-w-[420px] shrink-0 snap-start sm:w-[400px]">
                <CourseCard course={course} t={t} />
              </div>
            ))}
          </CourseCarousel>
        </div>
      </div>
    </main>
  );
}
