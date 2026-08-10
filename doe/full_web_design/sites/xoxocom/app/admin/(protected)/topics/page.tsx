import { removeTag, saveTag } from "@/app/admin/actions";
import { listAdminTags, listTagsInUse } from "@/lib/blog-admin";

/**
 * Topic labels.
 *
 * This screen exists for one reason: a post carries language-neutral tag SLUGS, while
 * the filter chips on /blog render a LABEL in the visitor's language. When the editor
 * creates a topic inline it can only seed both labels with whatever the author typed —
 * so a topic first used on a German post arrives with a German label sitting in the
 * English column, and vice versa. That label is visitor-facing. This is where it gets
 * corrected.
 *
 * Server-rendered, no client JS: every row is a form posting to a Server Action.
 */
export const dynamic = "force-dynamic";

const FIELD =
  "w-full rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent";

export default async function TopicsPage() {
  const [tags, inUse] = await Promise.all([listAdminTags(), listTagsInUse()]);

  /** A topic still attached to a post cannot be deleted: tags are a text[] of slugs
   *  rather than a foreign key, so nothing in the database would stop it, and /blog would
   *  be left rendering the bare slug as a chip label. */
  const deletable = (slug: string) => !inUse.has(slug);

  return (
    <main className="py-8">
      <h1 className="text-2xl font-extrabold tracking-tight">Topics</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        The slug is what a post stores and what appears in{" "}
        <span className="font-mono">/blog?tags=…</span>; the two labels are what readers
        see on the filter chips. Check both languages after creating a topic from the
        editor — it can only guess one of them.
      </p>

      <ul className="mt-8 border-t border-border">
        {tags.map((tag) => (
          <li key={tag.slug} className="border-b border-border py-4">
            <form
              action={saveTag}
              className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
            >
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Slug
                </span>
                {/* Read-only: the slug is stored on every post that uses this topic, and
                    blog.tags has no cascade, so editing it here would orphan them all.
                    Renaming a topic means creating the new one and re-tagging. */}
                <p className="mt-1 truncate font-mono text-sm">{tag.slug}</p>
                <input type="hidden" name="slug" value={tag.slug} />
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  German label
                </span>
                <input name="labelDe" defaultValue={tag.labelDe} required className={FIELD} />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  English label
                </span>
                <input name="labelEn" defaultValue={tag.labelEn} required className={FIELD} />
              </label>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition hover:border-fg"
                >
                  Save
                </button>
              </div>
            </form>

            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs text-muted">
                {inUse.has(tag.slug) ? "in use" : "not used by any post"}
              </span>
              {deletable(tag.slug) && (
                <form action={removeTag}>
                  <input type="hidden" name="slug" value={tag.slug} />
                  <button
                    type="submit"
                    className="text-xs font-semibold text-muted underline transition hover:text-fg"
                  >
                    Delete
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>

      {tags.length === 0 && (
        <p className="mt-10 text-muted">
          No topics yet. They are created automatically the first time you tag a post.
        </p>
      )}

      <form
        action={saveTag}
        className="mt-10 grid items-end gap-3 rounded-[var(--radius-card)] border border-border p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
      >
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            New slug
          </span>
          <input name="slug" required placeholder="ai-transformation" className={`${FIELD} font-mono`} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            German label
          </span>
          <input name="labelDe" required placeholder="KI-Transformation" className={FIELD} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            English label
          </span>
          <input name="labelEn" required placeholder="AI transformation" className={FIELD} />
        </label>
        <button
          type="submit"
          className="rounded-[var(--radius-card)] bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:opacity-90"
        >
          Add topic
        </button>
      </form>
    </main>
  );
}
