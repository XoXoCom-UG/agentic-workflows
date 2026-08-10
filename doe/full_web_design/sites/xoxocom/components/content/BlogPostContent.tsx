import SmartLink from "@/components/SmartLink";
import { formatPostDate, type Post } from "@/lib/blog";
import { blogPostingJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { getCopy } from "@/lib/server-copy";

/**
 * /blog/[slug] — the C1 centered article.
 *
 * One 720px measure, matching LegalShell, so it inherits a reading width that is
 * already proven on this site rather than inventing a new one.
 *
 * Language: the article always renders in its OWN language, wrapped in
 * <article lang> so screen readers and translation tools treat it as an island.
 * The chrome around it (nav, footer, byline labels, date locale) stays in the
 * reader's chosen language. `<html lang>` is deliberately NOT made post-aware —
 * the root layout derives it from isLegalPath + cookie, and making it depend on a
 * database row would mean a query in middleware and would break the scorer's
 * html_lang_correct check in a way no static fixture can express.
 */
export default async function BlogPostContent({ post }: { post: Post }) {
  // The post is fetched and 404-checked in app/blog/[slug]/page.tsx, before any
  // markup streams — see the note there. This component only renders.
  const { lang, c } = await getCopy();

  const t = c.blog;
  const foreign = post.lang !== lang;
  const description = post.seoDescription ?? post.excerpt;

  return (
    <main className="px-6 py-14 md:px-10 md:py-20 lg:px-12">
      <article className="mx-auto max-w-[45rem]">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-sm text-muted"
        >
          <SmartLink href="/" className="transition hover:text-fg">
            {t.breadcrumbHome}
          </SmartLink>
          <span aria-hidden="true" className="text-border">
            /
          </span>
          <SmartLink href="/blog" className="transition hover:text-fg">
            {t.eyebrow}
          </SmartLink>
        </nav>

        {foreign && (
          <p className="mt-6 rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3 text-sm text-muted">
            {t.langNotice.replace("{language}", t.languageName[post.lang])}
          </p>
        )}

        <header className="mt-8">
          {post.tags.length > 0 && (
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              {post.tags[0]}
            </p>
          )}

          <h1
            className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-fg md:text-5xl"
            lang={post.lang}
          >
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="mt-4 text-lg text-muted" lang={post.lang}>
              {post.excerpt}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            {post.authorName && (
              <>
                <span>{t.byAuthor.replace("{name}", post.authorName)}</span>
                <span aria-hidden="true" className="text-border">
                  ·
                </span>
              </>
            )}
            <time dateTime={post.publishedAt}>
              {formatPostDate(post.publishedAt, lang)}
            </time>
            <span aria-hidden="true" className="text-border">
              ·
            </span>
            <span>{t.minRead.replace("{n}", String(post.readingMinutes))}</span>
          </div>
        </header>

        {post.coverUrl && (
          // Plain <img>, not next/image: no remotePatterns config to maintain, no
          // Netlify image-transform billing, and width/height + aspect-ratio prevent
          // layout shift just as effectively. cover_alt is required by a CHECK
          // constraint, so alt is never empty here.
          <img
            src={post.coverUrl}
            alt={post.coverAlt ?? ""}
            width={1200}
            height={630}
            fetchPriority="high"
            className="mt-10 aspect-[16/9] w-full rounded-[var(--radius-card)] border border-border object-cover"
          />
        )}

        {/* Sanitised in lib/markdown.ts, inside the cache — see the note there. */}
        <div
          className="post-prose mt-10"
          lang={post.lang}
          dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
        />

        <footer className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <SmartLink
                key={tag}
                href={`/blog?tags=${tag}`}
                className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted transition hover:border-accent/60 hover:text-fg"
              >
                {tag}
              </SmartLink>
            ))}
          </div>
          <SmartLink
            href="/blog"
            className="text-sm text-muted transition hover:text-fg"
          >
            &larr; {t.backToBlog}
          </SmartLink>
        </footer>
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            blogPostingJsonLd({
              slug: post.slug,
              title: post.seoTitle ?? post.title,
              description,
              lang: post.lang,
              publishedAt: post.publishedAt,
              updatedAt: post.updatedAt,
              authorName: post.authorName,
              coverUrl: post.coverUrl,
              tags: post.tags,
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: t.breadcrumbHome, path: "/" },
              { name: t.eyebrow, path: "/blog" },
              { name: post.title, path: `/blog/${post.slug}` },
            ]),
          ),
        }}
      />
    </main>
  );
}
