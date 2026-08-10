"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { revalidateBlog } from "@/lib/blog";
import {
  POST_STATUSES,
  SlugTakenError,
  StaleWriteError,
  deletePostRow,
  deleteTag,
  insertPost,
  listTagsInUse,
  setPostStatus,
  updatePostRow,
  upsertTag,
  type PostInput,
  type PostStatus,
} from "@/lib/blog-admin";
import { getAuthedSupabase, requireAuthor } from "@/lib/supabase-auth";
import { slugify } from "@/lib/slugify";
import type { Lang } from "@/lib/copy";

/**
 * Every mutation the admin performs.
 *
 * Server Actions rather than route handlers: these are form-driven mutations from
 * authenticated server-rendered pages, and — decisively — `revalidateTag` can only be
 * called from a Server Action or a Route Handler, so cache invalidation belongs beside
 * the write. (/api/submit stays a route handler because it is a public endpoint fetched
 * by a client component. Different shape, different tool.)
 *
 * SECURITY: every action below starts with `await requireAuthor()`. That is not
 * belt-and-braces. A Server Action compiles to an addressable POST endpoint with a
 * stable id; the fact that the only button pointing at it sits behind a login gate does
 * not protect it, and neither does app/admin/layout.tsx. Removing one of those calls
 * removes a real access control. RLS on blog.posts is the third layer beneath it.
 */

/** Shape consumed by useActionState in the editor. */
export type ActionState = { error: string } | null;

const ADMIN_HOME = "/admin";

/** Longest body we accept. Guards against a paste that would blow up the DB row and the
 *  render cost; ~200 A4 pages of prose, far past any real article. */
const MAX_BODY_CHARS = 400_000;

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

/**
 * Only `/admin…` paths are accepted. Without this check, `?next=https://evil.example`
 * turns the login form into an open redirect that borrows this domain's credibility for
 * a phishing page. A protocol-relative `//evil.example` is also a full URL to the
 * browser, which is why the second condition is not redundant.
 */
function safeNext(raw: FormDataEntryValue | null): string {
  const next = typeof raw === "string" ? raw : "";
  if (!next.startsWith("/admin") || next.startsWith("//")) return ADMIN_HOME;
  return next;
}

export async function signIn(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) redirect(`/admin/login?error=missing&next=${encodeURIComponent(next)}`);

  const supabase = await getAuthedSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  // Deliberately generic, and deliberately not the Supabase message. "User not found"
  // versus "wrong password" tells an attacker which addresses have accounts.
  if (error || !data.user) {
    redirect(`/admin/login?error=invalid&next=${encodeURIComponent(next)}`);
  }

  // Valid credentials are not authorisation. The account must also be in blog.authors,
  // which is editable only with the service key. A signed-in non-author is signed back
  // out immediately rather than left holding a session that can do nothing.
  const { data: authorRow } = await supabase
    .schema("blog")
    .from("authors")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!authorRow) {
    await supabase.auth.signOut();
    redirect(`/admin/login?error=notauthor`);
  }

  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await getAuthedSupabase();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

function parseStatus(raw: FormDataEntryValue | null): PostStatus {
  const value = String(raw ?? "draft");
  return (POST_STATUSES as readonly string[]).includes(value)
    ? (value as PostStatus)
    : "draft";
}

function parseLang(raw: FormDataEntryValue | null): Lang {
  return String(raw ?? "en") === "de" ? "de" : "en";
}

/** Trim to null so an empty optional field stores NULL rather than "". The SEO helpers
 *  fall back on null; "" would win the ?? and emit an empty <title>. */
function optional(raw: FormDataEntryValue | null): string | null {
  const value = String(raw ?? "").trim();
  return value === "" ? null : value;
}

function parseTags(raw: FormDataEntryValue | null): string[] {
  return Array.from(
    new Set(
      String(raw ?? "")
        .split(",")
        .map((t) => slugify(t))
        .filter(Boolean),
    ),
  ).sort();
}

/**
 * Client-side validation is a convenience; this is the check that counts, because a
 * Server Action can be called with any payload. The database CHECK constraints are the
 * layer below — they would reject bad input anyway, but as an opaque SQL error rather
 * than a sentence the author can act on.
 */
function validate(input: PostInput): string | null {
  if (input.title.trim().length < 3) return "Give the post a title of at least 3 characters.";
  if (input.title.length > 120) return "The title is longer than 120 characters.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
    return "The slug must be lowercase words separated by single hyphens.";
  }
  if (input.excerpt.length > 300) return "The excerpt is longer than 300 characters.";
  if (input.bodyMd.length > MAX_BODY_CHARS) return "The body is too long.";
  if (input.status === "published" && input.bodyMd.trim() === "") {
    return "A published post needs a body. Save it as a draft instead.";
  }
  // The excerpt becomes the article's meta description when no SEO override is set, so
  // publishing without one ships a page with an empty description — invisible in the
  // editor, and exactly the kind of thing nobody notices for months.
  if (input.status === "published" && !input.seoDescription && input.excerpt.trim() === "") {
    return "A published post needs an excerpt (it becomes the search-result description).";
  }
  // Enforced here rather than in the DB because it is an editorial rule, not a data
  // integrity one: a cover with no alt text fails the all_img_have_alt SEO check for
  // the whole article route, and it is inaccessible.
  if (input.coverUrl && !input.coverAlt) {
    return "A cover image needs alt text describing what it shows.";
  }
  return null;
}

function readForm(formData: FormData): PostInput {
  const title = String(formData.get("title") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim();
  return {
    // An empty slug field falls back to the title, so an author who never touches the
    // slug still gets a valid URL.
    slug: slugify(rawSlug || title),
    lang: parseLang(formData.get("lang")),
    status: parseStatus(formData.get("status")),
    title,
    excerpt: String(formData.get("excerpt") ?? "").trim(),
    bodyMd: String(formData.get("bodyMd") ?? ""),
    coverUrl: optional(formData.get("coverUrl")),
    coverAlt: optional(formData.get("coverAlt")),
    tags: parseTags(formData.get("tags")),
    seoTitle: optional(formData.get("seoTitle")),
    seoDescription: optional(formData.get("seoDescription")),
  };
}

/**
 * Any tag the author typed that does not exist yet is created, seeding both labels with
 * the typed text. Without this a new tag would render on /blog as its bare slug, because
 * lib/blog.ts falls back to the slug when blog.tags has no row. Failure is logged and
 * swallowed: a missing label is cosmetic, and losing the whole save over it would not be.
 */
async function ensureTagsExist(tags: string[], typed: string): Promise<void> {
  if (tags.length === 0) return;
  const labelFor = new Map<string, string>(
    typed
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((label) => [slugify(label), label]),
  );
  await Promise.all(
    tags.map(async (slug) => {
      const label = labelFor.get(slug) ?? slug;
      try {
        await upsertTag({ slug, labelDe: label, labelEn: label });
      } catch (err) {
        console.error(`[admin] could not create tag "${slug}"`, err);
      }
    }),
  );
}

/**
 * Create or update, depending on whether the form carries an id.
 *
 * `redirect()` works by throwing a control-flow signal, so it must never be called
 * inside the try — a catch would swallow it and the navigation would silently not
 * happen. Every path below returns from the try or falls through to the redirect after.
 */
export async function savePost(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAuthor();

  const id = String(formData.get("id") ?? "").trim();
  const expectedUpdatedAt = String(formData.get("updatedAt") ?? "");
  const input = readForm(formData);

  const problem = validate(input);
  if (problem) return { error: problem };

  let savedSlug: string;
  try {
    await ensureTagsExist(input.tags, String(formData.get("tagsTyped") ?? ""));
    const saved = id
      ? await updatePostRow(id, expectedUpdatedAt, input)
      : await insertPost(input);
    savedSlug = saved.slug;
  } catch (err) {
    if (err instanceof SlugTakenError) {
      return { error: `The slug "${err.slug}" is already used by another post.` };
    }
    if (err instanceof StaleWriteError) {
      return {
        error:
          "Someone else saved this post after you opened it. Reload the page to see " +
          "their version before saving again — saving now would overwrite it.",
      };
    }
    console.error("[admin] savePost failed", err);
    return { error: "Could not save. The database rejected the write; check the logs." };
  }

  // A draft has no public page, but it may have just been unpublished, so the tags are
  // busted either way. Cheap, and the alternative is a stale article staying readable.
  await revalidateBlog(savedSlug);
  revalidatePath(ADMIN_HOME);
  redirect(ADMIN_HOME);
}

/** Shared by the Publish / Unpublish / Archive / Restore buttons on the list. */
async function transition(formData: FormData, status: PostStatus): Promise<void> {
  await requireAuthor();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const post = await setPostStatus(id, status);
  await revalidateBlog(post.slug);
  revalidatePath(ADMIN_HOME);
}

export async function publishPost(formData: FormData): Promise<void> {
  await transition(formData, "published");
}

export async function unpublishPost(formData: FormData): Promise<void> {
  await transition(formData, "draft");
}

export async function archivePost(formData: FormData): Promise<void> {
  await transition(formData, "archived");
}

export async function restorePost(formData: FormData): Promise<void> {
  await transition(formData, "draft");
}

/** Irreversible. The UI requires typing the slug to confirm; this re-checks it so the
 *  guarantee does not depend on client JS running. */
export async function deletePost(formData: FormData): Promise<void> {
  await requireAuthor();
  const id = String(formData.get("id") ?? "").trim();
  const confirmSlug = String(formData.get("confirmSlug") ?? "").trim();
  const expectedSlug = String(formData.get("slug") ?? "").trim();
  if (!id) return;

  // Redirect rather than return silently: a no-op page reload reads as "delete is
  // broken", and the natural response to that is to click it again.
  if (confirmSlug !== expectedSlug) redirect(`${ADMIN_HOME}?deleted=mismatch`);

  const slug = await deletePostRow(id);
  await revalidateBlog(slug);
  revalidatePath(ADMIN_HOME);
  redirect(`${ADMIN_HOME}?deleted=${encodeURIComponent(slug)}`);
}

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------

export async function saveTag(formData: FormData): Promise<void> {
  await requireAuthor();
  const slug = slugify(String(formData.get("slug") ?? ""));
  const labelDe = String(formData.get("labelDe") ?? "").trim();
  const labelEn = String(formData.get("labelEn") ?? "").trim();
  if (!slug || !labelDe || !labelEn) return;

  await upsertTag({ slug, labelDe, labelEn });
  // Tag labels render inside the filter chips, which are part of the cached index.
  await revalidateBlog();
  revalidatePath("/admin/topics");
}

export async function removeTag(formData: FormData): Promise<void> {
  await requireAuthor();
  const slug = slugify(String(formData.get("slug") ?? ""));
  if (!slug) return;

  // Posts reference tags as a text[] of slugs, not a foreign key, so nothing at the
  // database level stops this. Deleting a tag still in use would leave /blog rendering
  // a bare slug as a chip label.
  const inUse = await listTagsInUse();
  if (inUse.has(slug)) return;

  await deleteTag(slug);
  await revalidateBlog();
  revalidatePath("/admin/topics");
}
