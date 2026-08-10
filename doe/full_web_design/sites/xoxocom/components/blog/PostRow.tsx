import SmartLink from "@/components/SmartLink";
import { formatPostDate, type PostSummary } from "@/lib/blog";
import type { Copy, Lang } from "@/lib/copy";

type Props = {
  post: PostSummary;
  /** Chrome language — drives date locale and label wording, not the post's own text. */
  lang: Lang;
  t: Copy["blog"];
  /** Show a DE/EN pill. Only set on the ?lang=all view, where the list is mixed. */
  showLangPill?: boolean;
};

/**
 * One row of the B3 editorial index: a date/reading-time rail on the left, title and
 * excerpt on the right, hairline rule beneath. No cover image — that is the direction's
 * defining trade, and it means a post can be published without sourcing artwork.
 *
 * The title is an h2: the page's single h1 belongs to the index heading, and
 * score_seo.py checks single_h1 per route.
 */
export default function PostRow({ post, lang, t, showLangPill = false }: Props) {
  return (
    <article className="grid gap-3 border-b border-border py-7 md:grid-cols-[150px_minmax(0,1fr)] md:gap-8">
      <div className="pt-0.5">
        <p className="text-sm tabular-nums text-fg">
          {formatPostDate(post.publishedAt, lang)}
        </p>
        <p className="mt-1 text-xs text-muted">
          {t.minRead.replace("{n}", String(post.readingMinutes))}
        </p>
        {showLangPill && (
          <span className="mt-2 inline-flex rounded-full border border-border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-muted">
            {post.lang}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <h2 className="text-xl font-bold leading-snug tracking-tight md:text-2xl">
          <SmartLink
            href={`/blog/${post.slug}`}
            className="transition hover:text-accent"
            // The post's own language may differ from the chrome; mark the island so
            // screen readers and translation tools pronounce the title correctly.
            lang={post.lang}
          >
            {post.title}
          </SmartLink>
        </h2>

        {post.excerpt && (
          <p className="mt-2 text-muted" lang={post.lang}>
            {post.excerpt}
          </p>
        )}

        {post.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
