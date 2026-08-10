/**
 * Loading skeleton for /blog.
 *
 * Deliberately a plain component rendered through a <Suspense> inside
 * app/blog/page.tsx, NOT an app/blog/loading.tsx file. See the note in that page —
 * a segment-level loading.tsx would be inherited by /blog/[slug] and would turn its
 * 404s into soft 404s. A <Suspense> in the page is scoped to this route only.
 *
 * Server component, no client JS: the route otherwise ships none.
 */
export default function BlogIndexSkeleton() {
  return (
    <main className="px-6 py-20 md:px-10 md:py-28 lg:px-12" aria-busy="true">
      <div className="mx-auto max-w-4xl animate-pulse">
        <div className="h-3 w-16 rounded bg-surface" />
        <div className="mt-5 h-10 w-3/4 rounded bg-surface" />
        <div className="mt-4 h-4 w-1/2 rounded bg-surface" />
        <div className="mt-10 h-12 rounded border-y border-border bg-surface/40" />
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="grid gap-3 border-b border-border py-7 md:grid-cols-[150px_minmax(0,1fr)] md:gap-8"
          >
            <div>
              <div className="h-3 w-24 rounded bg-surface" />
              <div className="mt-2 h-3 w-16 rounded bg-surface" />
            </div>
            <div>
              <div className="h-6 w-5/6 rounded bg-surface" />
              <div className="mt-3 h-4 w-full rounded bg-surface" />
              <div className="mt-2 h-4 w-2/3 rounded bg-surface" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
