import SmartLink from "@/components/SmartLink";
import {
  archivePost,
  deletePost,
  publishPost,
  restorePost,
  unpublishPost,
} from "@/app/admin/actions";
import { listAllPosts, type AdminPostSummary, type PostStatus } from "@/lib/blog-admin";

/**
 * The post list — every post, every status, drafts first.
 *
 * Entirely server-rendered. Each action is a <form> posting to a Server Action, so this
 * page ships no client JavaScript at all, including the delete confirmation (a native
 * <details> disclosure). That is not asceticism: it means the admin keeps working when
 * a hydration error would otherwise leave the buttons dead.
 */

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<PostStatus, string> = {
  draft: "border-border text-muted",
  published: "border-accent text-accent",
  archived: "border-border text-muted opacity-60",
};

/** Admin timestamps are shown in Berlin time to match lib/blog.ts formatPostDate, so a
 *  post's date does not appear to change between the editor and the live article. */
function stamp(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(new Date(iso));
}

function ActionButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted transition hover:border-fg hover:text-fg"
    >
      {children}
    </button>
  );
}

function PostRow({ post }: { post: AdminPostSummary }) {
  return (
    <li className="grid gap-3 border-b border-border py-5 md:grid-cols-[minmax(0,1fr)_auto] md:gap-8">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${STATUS_STYLES[post.status]}`}
          >
            {post.status}
          </span>
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
            {post.lang}
          </span>
        </div>

        <h2 className="mt-2 truncate text-lg font-bold tracking-tight">
          <SmartLink href={`/admin/edit/${post.id}`} className="hover:text-accent">
            {post.title}
          </SmartLink>
        </h2>

        <p className="mt-1 truncate font-mono text-xs text-muted">/blog/{post.slug}</p>
        <p className="mt-1 text-xs text-muted">
          {post.authorName ?? "unattributed"} · edited {stamp(post.updatedAt)}
          {post.status === "published" && ` · published ${stamp(post.publishedAt)}`}
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-2 md:justify-end">
        <SmartLink
          href={`/admin/edit/${post.id}`}
          className="rounded-full border border-border px-3 py-1 text-xs font-semibold transition hover:border-fg"
        >
          Edit
        </SmartLink>

        {/* A published post has a live URL; a draft does not, so there is nothing to
            preview and the link would 404. */}
        {post.status === "published" && (
          <SmartLink
            href={`/blog/${post.slug}`}
            className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted transition hover:border-fg hover:text-fg"
          >
            View
          </SmartLink>
        )}

        {post.status !== "published" && (
          <form action={publishPost}>
            <input type="hidden" name="id" value={post.id} />
            <button
              type="submit"
              className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-fg transition hover:opacity-90"
            >
              Publish
            </button>
          </form>
        )}

        {post.status === "published" && (
          <form action={unpublishPost}>
            <input type="hidden" name="id" value={post.id} />
            <ActionButton>Unpublish</ActionButton>
          </form>
        )}

        {post.status !== "archived" ? (
          <form action={archivePost}>
            <input type="hidden" name="id" value={post.id} />
            <ActionButton>Archive</ActionButton>
          </form>
        ) : (
          <form action={restorePost}>
            <input type="hidden" name="id" value={post.id} />
            <ActionButton>Restore</ActionButton>
          </form>
        )}

        {/* Hard delete. A native <details> gives a two-step confirmation with no client
            JS, and typing the slug means it cannot be done by mis-clicking. The action
            re-checks the typed value server-side, so the guarantee does not depend on
            this markup. */}
        <details className="w-full md:w-auto">
          <summary className="inline-block cursor-pointer rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted transition hover:border-fg hover:text-fg">
            Delete
          </summary>
          <form
            action={deletePost}
            className="mt-2 rounded-[var(--radius-card)] border border-border bg-surface p-3"
          >
            <input type="hidden" name="id" value={post.id} />
            <input type="hidden" name="slug" value={post.slug} />
            <p className="text-xs text-muted">
              Permanent. Type <span className="font-mono text-fg">{post.slug}</span> to
              confirm.
            </p>
            <div className="mt-2 flex gap-2">
              <input
                name="confirmSlug"
                required
                autoComplete="off"
                className="min-w-0 flex-1 rounded-[var(--radius-card)] border border-border bg-bg px-2 py-1 font-mono text-xs outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold transition hover:border-fg"
              >
                Delete
              </button>
            </div>
          </form>
        </details>
      </div>
    </li>
  );
}

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;
  let posts: AdminPostSummary[] = [];
  let failure: string | null = null;

  // The public blog degrades silently to an empty list; the admin must not. An author
  // shown zero posts because the database is unreachable would reasonably conclude their
  // work had been lost.
  try {
    posts = await listAllPosts();
  } catch (err) {
    console.error("[admin] listAllPosts failed", err);
    failure = err instanceof Error ? err.message : "Unknown error";
  }

  return (
    <main className="py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Posts</h1>
          <p className="mt-1 text-sm text-muted">
            {posts.length === 1 ? "1 post" : `${posts.length} posts`} · drafts first
          </p>
        </div>
        <SmartLink
          href="/admin/new"
          className="rounded-[var(--radius-card)] bg-accent px-5 py-2.5 font-semibold text-accent-fg transition hover:opacity-90"
        >
          New post
        </SmartLink>
      </div>

      {failure && (
        <p
          role="alert"
          className="mt-6 rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3 text-sm"
        >
          Could not load posts: <span className="font-mono text-xs">{failure}</span>
        </p>
      )}

      {deleted && (
        <p
          role="status"
          className="mt-6 rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3 text-sm"
        >
          {deleted === "mismatch"
            ? "Nothing was deleted — the slug you typed did not match. Type it exactly to confirm."
            : `Deleted "${deleted}" permanently.`}
        </p>
      )}

      {!failure && posts.length === 0 && (
        <p className="mt-10 text-muted">
          Nothing here yet. <SmartLink href="/admin/new" className="text-accent underline">Write the first post</SmartLink>.
        </p>
      )}

      {posts.length > 0 && (
        <ul className="mt-8 border-t border-border">
          {posts.map((post) => (
            <PostRow key={post.id} post={post} />
          ))}
        </ul>
      )}
    </main>
  );
}
