import { notFound } from "next/navigation";

import { getCopy } from "@/lib/server-copy";
import { getCourse } from "@/lib/courses";
import SmartLink from "@/components/SmartLink";
import CourseArtwork from "@/components/courses/CourseArtwork";
import CourseStack from "@/components/courses/CourseStack";
import WaitlistForm from "@/components/courses/WaitlistForm";

/**
 * /courses/[slug] — one course.
 *
 * The page has exactly one conversion: join the waitlist. The course is not on sale
 * yet, so there is no "buy" path to compete with it, and every section above the form
 * exists to earn that email — value proposition, what makes it different, what you'll
 * work with. The price and level are stated up front rather than hidden behind the
 * signup: someone who finds out the price after giving us their address is a complaint,
 * not a lead.
 *
 * Server component throughout; only WaitlistForm ships JavaScript.
 */
export default async function CourseDetailContent({ slug }: { slug: string }) {
  const { c, lang } = await getCopy();
  const t = c.courses;
  const course = getCourse(lang, slug);
  // Unknown slug → a real 404, with the status code, not a "nothing here" page at 200.
  if (!course) notFound();

  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 md:px-10 lg:px-12 pt-12 pb-16 md:pt-16 md:pb-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-1/4 h-[560px] bg-[radial-gradient(55%_60%_at_50%_0%,rgba(251,107,76,0.16),transparent_70%)]"
        />

        <div className="relative mx-auto max-w-6xl">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <SmartLink href="/" className="transition-colors hover:text-fg">
              {t.breadcrumbHome}
            </SmartLink>
            <span aria-hidden className="mx-2 text-border">/</span>
            <SmartLink href="/courses" className="transition-colors hover:text-fg">
              {t.eyebrow}
            </SmartLink>
          </nav>

          <div className="mt-10 grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                {/* The "coming soon" state belongs here, on the page behind the card —
                    the card's job is to get the click, not to pre-empt it. */}
                <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-accent">
                  <span aria-hidden className="hue-breathe h-1.5 w-1.5 rounded-full bg-accent" />
                  {t.comingSoon}
                </span>
                <span className="rounded-md bg-surface px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.13em] text-muted">
                  {course.level}
                </span>
              </div>

              <h1 className="mt-6 text-4xl md:text-5xl font-extrabold leading-[1.08] tracking-tight text-fg">
                {course.headline}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{course.subheadline}</p>

              {/* The course's own title sits under the pitch, not above it: the visitor
                  buys the outcome first and the label second. */}
              <p className="mt-8 border-l-2 border-accent/60 pl-4 text-base font-semibold text-fg">
                {course.title}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t.priceLabel}</p>
                  <p className="mt-1 text-2xl font-extrabold tracking-tight text-fg">{course.price}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t.levelLabel}</p>
                  <p className="mt-1 text-base font-semibold text-fg">{course.level}</p>
                </div>
              </div>

              <a
                href="#waitlist"
                className="mt-9 inline-flex items-center gap-2 rounded-[var(--radius-card)] bg-accent px-7 py-3.5 font-semibold text-accent-fg transition hover:opacity-90"
              >
                {t.waitlist.submit}
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>

            <CourseArtwork className="aspect-[16/10] w-full rounded-[var(--radius-card)] border border-border" />
          </div>
        </div>
      </section>

      {/* ── What makes it different ──────────────────────────────────────────── */}
      <section className="px-6 md:px-10 lg:px-12 py-16 md:py-20">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {course.highlights.map((h) => (
            <article
              key={h.title}
              className="rounded-[var(--radius-card)] border border-border bg-surface p-7 transition-colors hover:border-accent/40"
            >
              <h2 className="text-lg font-bold text-fg">{h.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{h.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Stack ────────────────────────────────────────────────────────────── */}
      <CourseStack label={t.stackLabel} note={t.stackNote} />

      {/* ── Waitlist ───────────────────────────────────────────────────────────── */}
      <section id="waitlist" className="relative overflow-hidden scroll-mt-24 px-6 md:px-10 lg:px-12 py-20 md:py-28">
        <div
          aria-hidden
          className="hue-breathe pointer-events-none absolute -left-24 top-0 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(251,107,76,0.16),transparent_70%)] blur-2xl"
        />
        <div
          aria-hidden
          style={{ animationDelay: "-3.5s" }}
          className="hue-breathe pointer-events-none absolute -right-20 bottom-0 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(251,107,76,0.12),transparent_70%)] blur-2xl"
        />

        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-[var(--radius-card)] border border-accent/25 bg-surface/80 p-8 md:p-12 shadow-[0_0_70px_-20px_rgba(251,107,76,0.45)] backdrop-blur-sm">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(251,107,76,0.12),transparent_55%)]"
          />
          <div className="relative">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{t.waitlist.eyebrow}</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-fg">{t.waitlist.title}</h2>
            <p className="mt-4 text-muted">{t.waitlist.body}</p>

            <div className="mt-8">
              <WaitlistForm t={t.waitlist} courseSlug={course.slug} lang={lang} />
            </div>
          </div>
        </div>

        <div className="relative mx-auto mt-10 max-w-3xl text-center">
          <SmartLink href="/courses" className="text-sm font-semibold text-muted transition-colors hover:text-accent">
            ← {t.backToCourses}
          </SmartLink>
        </div>
      </section>
    </main>
  );
}
