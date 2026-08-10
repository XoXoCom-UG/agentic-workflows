import "server-only";

import { getAuthedSupabase } from "@/lib/supabase-auth";
import { readingMinutes } from "@/lib/markdown-render";
import type { Lang } from "@/lib/copy";

/**
 * Every read and write the admin area performs.
 *
 * Three differences from lib/blog.ts, all intentional:
 *
 *  1. It queries `blog.posts` (the table), not `blog.published_posts` (the view).
 *     Authors need to see drafts; that is the entire point of the admin.
 *  2. Nothing is cached. `unstable_cache` would serve one author the other author's
 *     stale list, and a "did my edit save?" screen that lies is worse than a slow one.
 *  3. It uses the SESSION client, so RLS applies. A signed-in user who is not in
 *     blog.authors gets zero rows from posts_author_read and a policy violation on
 *     every write — the database refuses, not the application.
 *
 * These functions throw. Unlike the public path, which degrades to an empty blog, an
 * admin who cannot reach the database must be told so plainly rather than shown an
 * empty post list that looks like "you have written nothing".
 */

const SCHEMA = "blog";

export const POST_STATUSES = ["draft", "published", "archived"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export type AdminPostSummary = {
  id: string;
  slug: string;
  lang: Lang;
  status: PostStatus;
  title: string;
  authorName: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

export type AdminPost = AdminPostSummary & {
  excerpt: string;
  bodyMd: string;
  coverUrl: string | null;
  coverAlt: string | null;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  readingMinutes: number;
};

export type AdminTag = { slug: string; labelDe: string; labelEn: string };

/** What the editor form submits. author_id/author_name are absent on purpose — the
 *  `blog.normalize_post()` trigger derives them from auth.uid(), so a client cannot
 *  publish under a colleague's byline. Do not add them here. */
export type PostInput = {
  slug: string;
  lang: Lang;
  status: PostStatus;
  title: string;
  excerpt: string;
  bodyMd: string;
  coverUrl: string | null;
  coverAlt: string | null;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
};

const SUMMARY_COLUMNS =
  "id, slug, lang, status, title, author_name, published_at, updated_at";
const FULL_COLUMNS =
  `${SUMMARY_COLUMNS}, excerpt, body_md, cover_url, cover_alt, tags, ` +
  "seo_title, seo_description, reading_minutes";

type Row = Record<string, unknown>;

/** supabase-js cannot infer row types from a composed select() string, so it widens the
 *  result to a union including GenericStringError[]. Going through unknown is the
 *  standard escape hatch; the runtime shape is guaranteed by the table, and every field
 *  is mapped explicitly below rather than spread. */
function rows(data: unknown): Row[] {
  return (data ?? []) as Row[];
}

/** Single-row variant. Same reason for the unknown hop: with a composed select() string
 *  supabase-js types .single() as possibly GenericStringError, which no direct cast to a
 *  record will satisfy. */
function row(data: unknown): Row {
  return data as Row;
}

function toSummary(r: Row): AdminPostSummary {
  return {
    id: String(r.id),
    slug: String(r.slug),
    lang: r.lang as Lang,
    status: r.status as PostStatus,
    title: String(r.title),
    authorName: (r.author_name as string | null) ?? null,
    publishedAt: (r.published_at as string | null) ?? null,
    updatedAt: String(r.updated_at),
  };
}

function toPost(r: Row): AdminPost {
  return {
    ...toSummary(r),
    excerpt: (r.excerpt as string | null) ?? "",
    bodyMd: (r.body_md as string | null) ?? "",
    coverUrl: (r.cover_url as string | null) ?? null,
    coverAlt: (r.cover_alt as string | null) ?? null,
    tags: (r.tags as string[] | null) ?? [],
    seoTitle: (r.seo_title as string | null) ?? null,
    seoDescription: (r.seo_description as string | null) ?? null,
    readingMinutes: Number(r.reading_minutes ?? 1),
  };
}

/** Maps a PostInput to column names. reading_minutes is derived here so the stored
 *  value can never disagree with the stored body. */
function toColumns(input: PostInput): Row {
  return {
    slug: input.slug,
    lang: input.lang,
    status: input.status,
    title: input.title,
    excerpt: input.excerpt,
    body_md: input.bodyMd,
    cover_url: input.coverUrl,
    cover_alt: input.coverAlt,
    tags: input.tags,
    seo_title: input.seoTitle,
    seo_description: input.seoDescription,
    reading_minutes: readingMinutes(input.bodyMd),
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Ordering puts what needs attention first: drafts, then published, then archived,
 * each most-recently-touched first. An author returning to the admin is far more often
 * resuming a draft than admiring a published post.
 */
const STATUS_RANK: Record<PostStatus, number> = { draft: 0, published: 1, archived: 2 };

export async function listAllPosts(): Promise<AdminPostSummary[]> {
  const supabase = await getAuthedSupabase();
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("posts")
    .select(SUMMARY_COLUMNS)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return rows(data)
    .map(toSummary)
    .sort(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        b.updatedAt.localeCompare(a.updatedAt),
    );
}

export async function getAdminPost(id: string): Promise<AdminPost | null> {
  const supabase = await getAuthedSupabase();
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("posts")
    .select(FULL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return toPost(row(data));
}

export async function listAdminTags(): Promise<AdminTag[]> {
  const supabase = await getAuthedSupabase();
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("tags")
    .select("slug, label_de, label_en")
    .order("slug");

  if (error) throw new Error(error.message);
  return rows(data).map((r) => ({
    slug: String(r.slug),
    labelDe: String(r.label_de),
    labelEn: String(r.label_en),
  }));
}

/** Slugs already in use, so the editor can suggest a free one. The UNIQUE index is
 *  still the arbiter — this only avoids showing the author a slug that will be
 *  rejected. `excludeId` lets an edit keep its own slug. */
export async function listTakenSlugs(excludeId?: string): Promise<string[]> {
  const supabase = await getAuthedSupabase();
  let query = supabase.schema(SCHEMA).from("posts").select("slug");
  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return rows(data).map((r) => String(r.slug));
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** Thrown when the row moved between load and save. Surfaced to the author rather than
 *  silently overwriting a colleague's edit. */
export class StaleWriteError extends Error {
  constructor() {
    super("STALE_WRITE");
    this.name = "StaleWriteError";
  }
}

/** Postgres unique-violation. Reported as "that slug is taken" rather than raw SQL. */
const UNIQUE_VIOLATION = "23505";

export class SlugTakenError extends Error {
  constructor(public readonly slug: string) {
    super("SLUG_TAKEN");
    this.name = "SlugTakenError";
  }
}

export async function insertPost(input: PostInput): Promise<AdminPost> {
  const supabase = await getAuthedSupabase();
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("posts")
    .insert(toColumns(input))
    .select(FULL_COLUMNS)
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw new SlugTakenError(input.slug);
    throw new Error(error.message);
  }
  return toPost(row(data));
}

/**
 * Optimistic concurrency, enforced by the database rather than by a read-then-compare.
 *
 * The WHERE clause matches on the `updated_at` the editor was loaded with. The trigger
 * stamps a fresh `updated_at` on every write, so if anyone saved in the meantime the
 * predicate misses, zero rows come back, and we raise instead of clobbering. A separate
 * SELECT-then-UPDATE would leave a window between the two; this has none.
 */
export async function updatePostRow(
  id: string,
  expectedUpdatedAt: string,
  input: PostInput,
): Promise<AdminPost> {
  const supabase = await getAuthedSupabase();
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("posts")
    .update(toColumns(input))
    .eq("id", id)
    .eq("updated_at", expectedUpdatedAt)
    .select(FULL_COLUMNS);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw new SlugTakenError(input.slug);
    throw new Error(error.message);
  }

  const updated = rows(data);
  // Zero rows is ambiguous between "someone else saved first" and "the id is gone".
  // Both mean the same thing to the author: reload before saving again.
  if (updated.length === 0) throw new StaleWriteError();
  return toPost(updated[0]);
}

/**
 * Status-only transition. Separate from updatePostRow because publishing from the list
 * view has no form state to carry, and because it must NOT be blocked by a stale
 * `updated_at` — an author clicking Publish is making a decision about the row as it
 * currently stands, not saving a copy they loaded earlier.
 */
export async function setPostStatus(
  id: string,
  status: PostStatus,
): Promise<AdminPostSummary> {
  const supabase = await getAuthedSupabase();
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("posts")
    .update({ status })
    .eq("id", id)
    .select(SUMMARY_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return toSummary(row(data));
}

/** Hard delete. The soft-delete path is setPostStatus(id, "archived"); this is the
 *  irreversible one and the UI puts it behind its own confirmation. Returns the slug so
 *  the caller can invalidate that post's cache tag. */
export async function deletePostRow(id: string): Promise<string> {
  const supabase = await getAuthedSupabase();
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("posts")
    .delete()
    .eq("id", id)
    .select("slug")
    .single();

  if (error) throw new Error(error.message);
  return String(row(data).slug);
}

/**
 * Create or update a topic.
 *
 * Both labels are required because the tag chips on /blog are visitor-facing: a tag
 * carrying an English label in the German column would render an English chip on a
 * German page. When the editor creates a tag inline it seeds both columns with the
 * typed label, and the Topics section of /admin is where the other language gets fixed.
 */
export async function upsertTag(tag: AdminTag): Promise<void> {
  const supabase = await getAuthedSupabase();
  const { error } = await supabase
    .schema(SCHEMA)
    .from("tags")
    .upsert(
      { slug: tag.slug, label_de: tag.labelDe, label_en: tag.labelEn },
      { onConflict: "slug" },
    );
  if (error) throw new Error(error.message);
}

/** Tags are not referenced by a foreign key (posts carry a text[] of slugs), so
 *  deleting a tag that is still in use would leave chips rendering their bare slug.
 *  The caller checks usage first. */
export async function deleteTag(slug: string): Promise<void> {
  const supabase = await getAuthedSupabase();
  const { error } = await supabase.schema(SCHEMA).from("tags").delete().eq("slug", slug);
  if (error) throw new Error(error.message);
}

/** Slugs of tags currently attached to at least one post, any status. */
export async function listTagsInUse(): Promise<Set<string>> {
  const supabase = await getAuthedSupabase();
  const { data, error } = await supabase.schema(SCHEMA).from("posts").select("tags");
  if (error) throw new Error(error.message);
  const used = new Set<string>();
  for (const r of rows(data)) {
    for (const t of (r.tags as string[] | null) ?? []) used.add(t);
  }
  return used;
}
