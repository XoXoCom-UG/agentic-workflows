"use client";

import {
  useActionState,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { savePost, type ActionState } from "@/app/admin/actions";
import { renderMarkdownUnsanitised, readingMinutes } from "@/lib/markdown-render";
import { slugify, uniqueSlug } from "@/lib/slugify";
import type { AdminPost, AdminTag, PostStatus } from "@/lib/blog-admin";

/**
 * The markdown editor. The ONLY "use client" component in the blog feature.
 *
 * That is safe for the performance budget by construction: it is reachable only from
 * /admin, which is in neither scorer's route list and cannot enter the shared-JS chunk
 * that every public page pays for. The risk runs the other way — pulling a server module
 * into this graph — which the `import "server-only"` guards in lib/blog.ts,
 * lib/blog-admin.ts, and lib/markdown.ts prevent. Note this file imports
 * lib/markdown-render (client-safe) and NOT lib/markdown (which pulls sanitize-html).
 *
 * The preview therefore runs the byte-identical renderer production runs, minus
 * sanitisation, inside .post-prose — the same class the live article uses. What you see
 * is what ships. It is unsanitised because it is your own draft in your own browser and
 * is never served to anyone; lib/markdown.ts sanitises on the render path.
 */

type Props = {
  /** Absent when creating. */
  post: AdminPost | null;
  tags: AdminTag[];
  takenSlugs: string[];
};

/** SEO description sweet spot. Not enforced — an author may have a good reason — but
 *  shown, because the excerpt becomes the meta description when no override is set. */
const EXCERPT_IDEAL_MIN = 120;
const EXCERPT_IDEAL_MAX = 160;
const EXCERPT_HARD_MAX = 300;

const FIELD =
  "w-full rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2 text-fg outline-none focus:border-accent";
const LABEL = "text-sm font-semibold";
const HINT = "text-xs text-muted";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={LABEL}>{label}</span>
      {children}
      {hint && <span className={HINT}>{hint}</span>}
    </label>
  );
}

export default function PostEditor({ post, tags, takenSlugs }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    savePost,
    null,
  );

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  // Once the author edits the slug by hand, stop overwriting it from the title.
  // Renaming a published post's slug changes its live URL, so this must never happen
  // behind their back.
  const [slugPinned, setSlugPinned] = useState(Boolean(post));
  const [lang, setLang] = useState(post?.lang ?? "en");
  const [status, setStatus] = useState<PostStatus>(post?.status ?? "draft");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [bodyMd, setBodyMd] = useState(post?.bodyMd ?? "");
  const [tagText, setTagText] = useState((post?.tags ?? []).join(", "));
  const [coverUrl, setCoverUrl] = useState(post?.coverUrl ?? "");
  const [coverAlt, setCoverAlt] = useState(post?.coverAlt ?? "");
  const [seoTitle, setSeoTitle] = useState(post?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(post?.seoDescription ?? "");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // useDeferredValue keeps typing responsive on a long body: React renders the preview
  // at a lower priority and drops intermediate values instead of parsing markdown on
  // every keystroke. Cheaper and less fiddly than a manual debounce.
  const deferredBody = useDeferredValue(bodyMd);
  const previewHtml = useMemo(
    () => renderMarkdownUnsanitised(deferredBody),
    [deferredBody],
  );

  const selectedTags = useMemo(
    () => new Set(tagText.split(",").map((t) => slugify(t)).filter(Boolean)),
    [tagText],
  );

  function onTitleChange(value: string) {
    setTitle(value);
    if (!slugPinned) setSlug(uniqueSlug(value, takenSlugs));
  }

  function toggleTag(tagSlug: string, label: string) {
    const current = tagText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const next = selectedTags.has(tagSlug)
      ? current.filter((t) => slugify(t) !== tagSlug)
      : [...current, label];
    setTagText(next.join(", "));
  }

  /** Insert text at the caret rather than appending, so an image lands where the author
   *  was writing. Falls back to appending if the textarea is not focused. */
  function insertIntoBody(snippet: string) {
    const el = bodyRef.current;
    if (!el) {
      setBodyMd((b) => `${b}\n\n${snippet}\n`);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const next = `${el.value.slice(0, start)}${snippet}${el.value.slice(end)}`;
    setBodyMd(next);
    // Restore the caret after React re-renders, or it jumps to the end.
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + snippet.length;
      el.setSelectionRange(caret, caret);
    });
  }

  async function upload(file: File): Promise<string | null> {
    setUploadError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setUploadError(json.error ?? `Upload failed (${res.status}).`);
        return null;
      }
      return json.url;
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function onCoverPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-picked after an error
    if (!file) return;
    const url = await upload(file);
    if (url) setCoverUrl(url);
  }

  async function onInlinePick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = await upload(file);
    // Alt text is left for the author to fill in between the brackets — a placeholder
    // that reads like real alt text would be worse than an obvious blank.
    if (url) insertIntoBody(`![](${url})`);
  }

  const excerptTone =
    excerpt.length === 0
      ? "text-muted"
      : excerpt.length < EXCERPT_IDEAL_MIN || excerpt.length > EXCERPT_IDEAL_MAX
        ? "text-accent"
        : "text-muted";

  return (
    <form action={formAction} className="py-8">
      {post && (
        <>
          <input type="hidden" name="id" value={post.id} />
          {/* Optimistic-concurrency token. The UPDATE matches on this value, so if a
              colleague saved after this page loaded, the write is refused instead of
              overwriting them. */}
          <input type="hidden" name="updatedAt" value={post.updatedAt} />
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {post ? "Edit post" : "New post"}
        </h1>
        <div className="flex items-center gap-3">
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as PostStatus)}
            className="rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2 text-sm font-semibold outline-none focus:border-accent"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <button
            type="submit"
            disabled={pending}
            className="rounded-[var(--radius-card)] bg-accent px-5 py-2.5 font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {state?.error && (
        <p
          role="alert"
          className="mt-5 rounded-[var(--radius-card)] border border-accent bg-surface px-4 py-3 text-sm"
        >
          {state.error}
        </p>
      )}

      <div className="mt-7 grid gap-5 md:grid-cols-2">
        <Field label="Title">
          <input
            name="title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            required
            minLength={3}
            maxLength={120}
            className={FIELD}
          />
        </Field>

        <Field
          label="Slug"
          hint={
            <>
              The live URL: <span className="font-mono">/blog/{slug || "…"}</span>
              {post?.status === "published" &&
                " — changing this breaks the existing link."}
            </>
          }
        >
          <input
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugPinned(true);
              setSlug(slugify(e.target.value));
            }}
            className={`${FIELD} font-mono text-sm`}
          />
        </Field>

        <Field
          label="Language"
          hint="One language per post. The /blog index shows only posts matching the visitor's language."
        >
          <select
            name="lang"
            value={lang}
            onChange={(e) => setLang(e.target.value as "de" | "en")}
            className={FIELD}
          >
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>
        </Field>

        <Field
          label="Topics"
          hint="Comma-separated. These become the filter chips on /blog; new ones are created automatically."
        >
          <input
            name="tags"
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
            className={FIELD}
          />
          {/* Sent alongside the slugified list so a brand-new topic keeps the author's
              capitalisation as its label instead of rendering as a bare slug. */}
          <input type="hidden" name="tagsTyped" value={tagText} />
        </Field>
      </div>

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((t) => {
            const on = selectedTags.has(t.slug);
            return (
              <button
                key={t.slug}
                type="button"
                onClick={() => toggleTag(t.slug, lang === "de" ? t.labelDe : t.labelEn)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  on
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border text-muted hover:border-fg hover:text-fg"
                }`}
              >
                {lang === "de" ? t.labelDe : t.labelEn}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-5">
        <Field
          label="Excerpt"
          hint={
            <span className={excerptTone}>
              {excerpt.length}/{EXCERPT_HARD_MAX} — aim for {EXCERPT_IDEAL_MIN}–
              {EXCERPT_IDEAL_MAX}. Shown on the index and used as the meta description
              unless you override it below.
            </span>
          }
        >
          <textarea
            name="excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            maxLength={EXCERPT_HARD_MAX}
            rows={2}
            className={FIELD}
          />
        </Field>
      </div>

      {/* --- cover ------------------------------------------------------------ */}
      <fieldset className="mt-7 rounded-[var(--radius-card)] border border-border p-4">
        <legend className="px-2 text-sm font-semibold">Cover image</legend>
        <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
          <div>
            {coverUrl ? (
              // A plain <img>, matching the public article: no next/image means no
              // remotePatterns config and no Netlify image-transform billing.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverUrl}
                alt={coverAlt || "Cover preview"}
                className="aspect-[16/9] w-full rounded-[var(--radius-card)] object-cover"
              />
            ) : (
              <div className="grid aspect-[16/9] w-full place-items-center rounded-[var(--radius-card)] border border-dashed border-border text-xs text-muted">
                No cover
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              onChange={onCoverPick}
              disabled={uploading}
              className="text-sm text-muted"
            />
            <input
              name="coverUrl"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="…or paste an image URL"
              className={`${FIELD} font-mono text-xs`}
            />
            <Field
              label="Alt text"
              hint="Required when there is a cover. Describe what the image shows, not that it is an image."
            >
              <input
                name="coverAlt"
                value={coverAlt}
                onChange={(e) => setCoverAlt(e.target.value)}
                required={Boolean(coverUrl)}
                className={FIELD}
              />
            </Field>
          </div>
        </div>
      </fieldset>

      {/* --- body + preview -------------------------------------------------- */}
      <div className="mt-7">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span className={LABEL}>Body</span>
          <span className={HINT}>
            Markdown · {readingMinutes(bodyMd)} min read ·{" "}
            <label className="cursor-pointer underline">
              insert image
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                onChange={onInlinePick}
                disabled={uploading}
                className="hidden"
              />
            </label>
            {uploading && " · uploading…"}
          </span>
        </div>

        {uploadError && (
          <p role="alert" className="mt-2 text-sm text-accent">
            {uploadError}
          </p>
        )}

        <div className="mt-2 grid gap-4 lg:grid-cols-2">
          <textarea
            ref={bodyRef}
            name="bodyMd"
            value={bodyMd}
            onChange={(e) => setBodyMd(e.target.value)}
            rows={26}
            spellCheck
            className={`${FIELD} resize-y font-mono text-sm leading-relaxed`}
            placeholder={"## A heading\n\nWrite the article here."}
          />
          <div className="overflow-y-auto rounded-[var(--radius-card)] border border-border bg-surface p-5">
            {/* Same class as the live article, so spacing and type are identical. */}
            <div
              className="post-prose"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
            {!previewHtml && <p className={HINT}>The preview appears as you type.</p>}
          </div>
        </div>
        <p className={`mt-2 ${HINT}`}>
          Headings shift down one level, so <span className="font-mono">##</span> renders
          as an h3 — the page title is the only h1. Start at{" "}
          <span className="font-mono">##</span>.
        </p>
      </div>

      {/* --- SEO overrides ---------------------------------------------------- */}
      <details className="mt-7 rounded-[var(--radius-card)] border border-border p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          SEO overrides (optional)
        </summary>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <Field
            label="Meta title"
            hint={`${seoTitle.length} chars — 30–60 is the target. Falls back to the post title.`}
          >
            <input
              name="seoTitle"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              className={FIELD}
            />
          </Field>
          <Field
            label="Meta description"
            hint={`${seoDescription.length} chars — 120–160 is the target. Falls back to the excerpt.`}
          >
            <input
              name="seoDescription"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              className={FIELD}
            />
          </Field>
        </div>
      </details>
    </form>
  );
}
