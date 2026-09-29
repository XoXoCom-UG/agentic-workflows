import type { CourseEntry, Copy } from "@/lib/copy";
import SmartLink from "@/components/SmartLink";
import CourseArtwork from "@/components/courses/CourseArtwork";

/**
 * One course, as a card in the carousel on /courses.
 *
 * The whole card is a single <SmartLink>, not a div with a button inside it: one tab
 * stop, one hit target, and the hover state can then be expressed once on `group`
 * instead of being wired up per element. Everything inside — including the artwork's
 * glow and the arrow badge — reacts through `group-hover:`.
 */
export default function CourseCard({ course, t }: { course: CourseEntry; t: Copy["courses"] }) {
  return (
    <SmartLink
      href={`/courses/${course.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/60 hover:shadow-[0_28px_60px_-28px_rgba(251,107,76,0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <div className="relative">
        <CourseArtwork className="aspect-[16/10] w-full" />

        {/* Affordance in the corner the screenshot used for a wishlist heart. This card
            has one job — open the course — so the corner states that instead. */}
        <span
          aria-hidden
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-bg/70 text-fg backdrop-blur-sm transition-all duration-300 group-hover:border-accent group-hover:bg-accent group-hover:text-accent-fg"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="transition-transform duration-300 group-hover:translate-x-0.5">
            <path d="M3 8h9M8.5 4.5L12 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-md bg-accent/12 px-2.5 py-1 text-[0.66rem] font-bold uppercase tracking-[0.13em] text-accent">
            {course.level}
          </span>
          <span className="text-base font-bold text-fg">
            {course.price} <span className="text-xs font-medium text-muted">{t.priceUnit}</span>
          </span>
        </div>

        <h3 className="mt-4 text-lg font-bold leading-snug tracking-tight text-fg transition-colors duration-300 group-hover:text-accent">
          {course.title}
        </h3>
        {/* mb-6 rather than a margin on the row below: that row uses mt-auto to pin
            itself to the card's floor, and a second margin-top class would collide. */}
        <p className="mt-2.5 mb-6 text-sm leading-relaxed text-muted">{course.cardSummary}</p>

        {/* mt-auto pins the meta row to the bottom, so cards of different summary
            lengths still line up across the carousel. */}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            {course.tags.map((tag, i) => (
              <span key={tag} className="flex items-center gap-1.5 font-mono text-[0.68rem] uppercase tracking-wider text-muted">
                {i > 0 && <span aria-hidden className="text-muted/50">·</span>}
                {tag}
              </span>
            ))}
          </span>
          <span className="whitespace-nowrap text-sm font-semibold text-fg transition-colors duration-300 group-hover:text-accent">
            {t.viewCourse} →
          </span>
        </div>
      </div>
    </SmartLink>
  );
}
