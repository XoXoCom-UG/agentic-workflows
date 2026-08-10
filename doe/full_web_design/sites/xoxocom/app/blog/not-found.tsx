import SmartLink from "@/components/SmartLink";
import { getCopy } from "@/lib/server-copy";

/**
 * Covers notFound() from /blog/[slug] and any unmatched /blog/** path.
 *
 * A server component, so the copy comes from getCopy() like every other page. Next's
 * error.tsx would have to be a client component and could not read the copy tree
 * without pulling it into the browser bundle — which is one reason lib/blog.ts
 * degrades to empty results instead of throwing.
 */
export default async function BlogNotFound() {
  const { c } = await getCopy();
  const t = c.blog;

  return (
    <main className="px-6 py-24 md:px-10 md:py-32 lg:px-12">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          404
        </p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-fg md:text-4xl">
          {t.notFoundTitle}
        </h1>
        <p className="mt-4 text-muted">{t.notFoundBody}</p>
        <SmartLink
          href="/blog"
          className="mt-8 inline-flex items-center rounded-[var(--radius-card)] bg-accent px-6 py-3 font-semibold text-accent-fg transition hover:opacity-90"
        >
          {t.backToBlog}
        </SmartLink>
      </div>
    </main>
  );
}
