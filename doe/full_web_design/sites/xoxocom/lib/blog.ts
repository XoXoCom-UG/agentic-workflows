import "server-only";

import { unstable_cache, revalidateTag } from "next/cache";

import { getSupabase } from "@/lib/supabase";
import { renderPostMarkdown } from "@/lib/markdown";
import type { Lang } from "@/lib/copy";

/**
 * The single source of blog reads for the public site.
 *
 * Two things here are easy to get wrong and expensive to debug:
 *
 * 1. WHAT WE QUERY. Never `blog.posts` — always the `blog.published_posts` view,
 *    whose WHERE clause pins `status = 'published' AND published_at <= now()`.
 *    getSupabase() is a SERVICE ROLE client, which bypasses RLS unconditionally, so
 *    RLS is not what keeps drafts off the internet here. The view is. A forgotten
 *    `.eq("status", …)` cannot leak a draft because there is no draft to select.
 *
 * 2. THE CACHE / cookies() RULE. You may not call cookies() inside an
 *    unstable_cache callback — it throws — but you may call a cached function from a
 *    dynamic page. So `lang` is resolved by getCopy() in the component and passed in
 *    as an ARGUMENT, becoming part of the cache key. Never read it inside a callback.
 *    The page stays dynamic and correct; the database round-trip is amortised.
 *
 *    Markdown is rendered INSIDE the post cache, so marked + sanitisation run once per
 *    revalidation rather than once per request. That is what makes sanitising free.
 *
 * Netlify caveat: revalidateTag is only honoured by @netlify/plugin-nextjs v5, which
 * backs the Data Cache with Netlify Blobs. On v4 it silently no-ops and the
 * `revalidate` floor below becomes the real freshness bound. The plugin is installed
 * through the Netlify UI, so its version is not visible in this repo — check the build
 * log. Nothing breaks either way; publishing is just not instant on v4.
 */

const SCHEMA = "blog";
const PUBLISHED = "published_posts";

/** Cache tags. BLOG_TAG busts everything; postTag busts one article. */
export const BLOG_TAG = "blog";
export const postTag = (slug: string) => `blog:post:${slug}`;

/** Upper bound on a single index query. The UI does not paginate yet, but the data
 *  layer does, so switching pagination on later is a component change only. */
export const POSTS_PAGE_SIZE = 24;

/** Freshness floor. Tag invalidation normally beats this to the punch. */
const REVALIDATE_SECONDS = 300;

export type PostSummary = {
  slug: string;
  lang: Lang;
  title: string;
  excerpt: string;
  coverUrl: string | null;
  coverAlt: string | null;
  tags: string[];
  publishedAt: string;
  updatedAt: string | null;
  readingMinutes: number;
  authorName: string | null;
};

export type Post = PostSummary & {
  /** Sanitised HTML, rendered inside the cache. Safe for dangerouslySetInnerHTML. */
  bodyHtml: string;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type TagCount = { tag: string; label: string; count: number };

type PostRow = {
  slug: string;
  lang: Lang;
  title: string;
  excerpt: string | null;
  body_md: string | null;
  cover_url: string | null;
  cover_alt: string | null;
  tags: string[] | null;
  reading_minutes: number | null;
  seo_title: string | null;
  seo_description: string | null;
  author_name: string | null;
  published_at: string;
  updated_at: string | null;
};

const SUMMARY_COLUMNS =
  "slug, lang, title, excerpt, cover_url, cover_alt, tags, reading_minutes, " +
  "author_name, published_at, updated_at";

const POST_COLUMNS = `${SUMMARY_COLUMNS}, body_md, seo_title, seo_description`;

/**
 * supabase-js infers row types by parsing the select() string at the type level. It
 * cannot do that for a composed constant, so it widens the result to a union that
 * includes GenericStringError[] and a direct cast is rejected. Going through unknown
 * is the standard escape hatch when not using generated database types. The runtime
 * shape is guaranteed by the `blog.published_posts` view, not by this cast — which is
 * why every field is mapped explicitly in toSummary() rather than spread.
 */
function rows(data: unknown): PostRow[] {
  return (data ?? []) as PostRow[];
}

function toSummary(row: PostRow): PostSummary {
  return {
    slug: row.slug,
    lang: row.lang,
    title: row.title,
    excerpt: row.excerpt ?? "",
    coverUrl: row.cover_url,
    coverAlt: row.cover_alt,
    tags: row.tags ?? [],
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    readingMinutes: row.reading_minutes ?? 1,
    authorName: row.author_name,
  };
}

// ---------------------------------------------------------------------------
// Public reads
//
// These never throw. A Supabase outage renders an empty blog, not a 500 — which
// matters twice over: /sitemap.xml failing is a hard gate in score_seo.py, and an
// error boundary would have to be a client component, dragging lib/copy.ts into the
// browser bundle just to render a sentence.
// ---------------------------------------------------------------------------

const summariesCache = (lang: Lang) =>
  unstable_cache(
    async (): Promise<PostSummary[]> => {
      const { data, error } = await getSupabase()
        .schema(SCHEMA)
        .from(PUBLISHED)
        .select(SUMMARY_COLUMNS)
        .eq("lang", lang)
        .order("published_at", { ascending: false })
        .limit(POSTS_PAGE_SIZE);

      if (error) throw error;
      return rows(data).map(toSummary);
    },
    ["blog", "summaries", lang],
    { tags: [BLOG_TAG], revalidate: REVALIDATE_SECONDS },
  );

export async function listPostSummaries(lang: Lang): Promise<PostSummary[]> {
  try {
    return await summariesCache(lang)();
  } catch (err) {
    console.error("[blog] listPostSummaries failed", err);
    return [];
  }
}

/**
 * Tag filtering is applied here rather than in the query so every filtered view is
 * served from the same cached array — one database round-trip covers the whole index
 * including every tag combination. AND semantics: selecting two tags narrows to posts
 * carrying both, which is what "filter by topic" means to a reader.
 */
export async function listPosts(
  { lang, tags = [] }: { lang: Lang; tags?: string[] },
): Promise<PostSummary[]> {
  const all = await listPostSummaries(lang);
  if (tags.length === 0) return all;
  return all.filter((p) => tags.every((t) => p.tags.includes(t)));
}

/** True when the other language has posts — drives the empty-state escape hatch. */
export async function hasPostsInOtherLanguage(lang: Lang): Promise<boolean> {
  const other: Lang = lang === "de" ? "en" : "de";
  return (await listPostSummaries(other)).length > 0;
}

const tagsCache = (lang: Lang) =>
  unstable_cache(
    async (): Promise<TagCount[]> => {
      const db = getSupabase().schema(SCHEMA);

      const [{ data: counts, error: countErr }, { data: labels, error: labelErr }] =
        await Promise.all([
          db.from("tag_counts").select("tag, post_count").eq("lang", lang),
          db.from("tags").select("slug, label_de, label_en"),
        ]);

      if (countErr) throw countErr;
      if (labelErr) throw labelErr;

      const labelFor = new Map<string, string>(
        (labels as { slug: string; label_de: string; label_en: string }[] ?? []).map(
          (t) => [t.slug, lang === "de" ? t.label_de : t.label_en],
        ),
      );

      return ((counts as { tag: string; post_count: number }[]) ?? [])
        .map((c) => ({
          tag: c.tag,
          // A tag used on a post but missing from blog.tags still renders, using its
          // slug. Better a slightly ugly chip than a filter the reader cannot see.
          label: labelFor.get(c.tag) ?? c.tag,
          count: c.post_count,
        }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    },
    ["blog", "tags", lang],
    { tags: [BLOG_TAG], revalidate: REVALIDATE_SECONDS },
  );

export async function listTags(lang: Lang): Promise<TagCount[]> {
  try {
    return await tagsCache(lang)();
  } catch (err) {
    console.error("[blog] listTags failed", err);
    return [];
  }
}

const postCache = (slug: string) =>
  unstable_cache(
    async (): Promise<Post | null> => {
      const { data, error } = await getSupabase()
        .schema(SCHEMA)
        .from(PUBLISHED)
        .select(POST_COLUMNS)
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const [row] = rows([data]);
      return {
        ...toSummary(row),
        bodyHtml: renderPostMarkdown(row.body_md ?? ""),
        seoTitle: row.seo_title,
        seoDescription: row.seo_description,
      };
    },
    ["blog", "post", slug],
    { tags: [BLOG_TAG, postTag(slug)], revalidate: REVALIDATE_SECONDS },
  );

export async function getPostBySlug(slug: string): Promise<Post | null> {
  try {
    return await postCache(slug)();
  } catch (err) {
    console.error(`[blog] getPostBySlug(${slug}) failed`, err);
    return null;
  }
}

const sitemapCache = unstable_cache(
  async (): Promise<{ slug: string; updatedAt: string }[]> => {
    const { data, error } = await getSupabase()
      .schema(SCHEMA)
      .from(PUBLISHED)
      .select("slug, updated_at, published_at")
      .order("published_at", { ascending: false });

    if (error) throw error;
    return rows(data).map((r) => ({
      slug: r.slug,
      updatedAt: r.updated_at ?? r.published_at,
    }));
  },
  ["blog", "sitemap"],
  { tags: [BLOG_TAG], revalidate: REVALIDATE_SECONDS },
);

/** Used by app/sitemap.ts. Caller must still guard: a failing sitemap is a hard gate. */
export async function listPublishedForSitemap(): Promise<{ slug: string; updatedAt: string }[]> {
  try {
    return await sitemapCache();
  } catch (err) {
    console.error("[blog] listPublishedForSitemap failed", err);
    return [];
  }
}

/** Called by the admin Server Actions after every write. */
export async function revalidateBlog(slug?: string): Promise<void> {
  revalidateTag(BLOG_TAG);
  if (slug) revalidateTag(postTag(slug));
}

// ---------------------------------------------------------------------------
// Pure helpers — no I/O, safe to unit test
// ---------------------------------------------------------------------------

/** Cap on tags per URL. Bounds the crawlable surface of ?tags= permutations. */
const MAX_ACTIVE_TAGS = 5;

/**
 * Parse ?tags=a,b into a canonical list. Sorting collapses ?tags=b,a and ?tags=a,b
 * into one view; the cap plus the caller's intersection with known tags stops a
 * crawler generating unbounded distinct URLs from junk input.
 */
export function parseTagsParam(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const joined = Array.isArray(raw) ? raw.join(",") : raw;
  return Array.from(
    new Set(
      joined
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  )
    .sort()
    .slice(0, MAX_ACTIVE_TAGS);
}

/** The href a tag chip links to: the current selection with this tag toggled. */
export function tagHref(active: string[], tag: string): string {
  const next = active.includes(tag)
    ? active.filter((t) => t !== tag)
    : [...active, tag].sort().slice(0, MAX_ACTIVE_TAGS);
  return next.length ? `/blog?tags=${next.join(",")}` : "/blog";
}

/**
 * Timezone is pinned so Netlify's UTC runtime and a German desk agree on the date.
 * Without it a post published late evening shows a different day on the server.
 */
export function formatPostDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-US", {
    dateStyle: "long",
    timeZone: "Europe/Berlin",
  }).format(new Date(iso));
}
