import "server-only";

import sanitizeHtml from "sanitize-html";

import { renderMarkdownUnsanitised, readingMinutes } from "@/lib/markdown-render";

/**
 * The public render path for a blog post body: Markdown -> HTML -> sanitised HTML.
 *
 * The Markdown step lives in lib/markdown-render.ts, which is client-safe, so the
 * admin editor's live preview imports the identical renderer and cannot drift from
 * what visitors see. This module adds the one thing the preview does not need.
 *
 * Sanitisation is load-bearing. Post bodies are database rows rendered at runtime
 * through dangerouslySetInnerHTML, so a compromised admin session or any direct DB
 * write would otherwise be stored XSS on the marketing domain. "Only admins can write"
 * is a policy control; this is the technical one. It runs inside the post cache in
 * lib/blog.ts, so the cost is once per revalidation, not once per request.
 */

/**
 * Allowlist mirrors what the renderer can emit, plus the GFM elements (tables, task
 * lists). Anything an author pastes that is not on this list is dropped rather than
 * escaped, so a stray <script> leaves no visible residue.
 *
 * Note h1 is absent: the renderer's heading shift means a body can never produce one,
 * and leaving it off the list makes that a second, independent guarantee.
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h2", "h3", "h4", "h5", "h6",
    "p", "a", "ul", "ol", "li", "blockquote", "hr", "br",
    "strong", "em", "del", "code", "pre",
    "img", "figure", "figcaption",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "loading", "decoding", "width", "height"],
    h2: ["id"], h3: ["id"], h4: ["id"], h5: ["id"], h6: ["id"],
    th: ["colspan", "rowspan", "align"],
    td: ["colspan", "rowspan", "align"],
    code: ["class"], // marked emits language-xxx on fenced blocks
  },
  allowedSchemes: ["http", "https", "mailto"],
  // Relative hrefs (/kontakt, /blog/other-post) must survive; they carry no scheme.
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
};

/** Render a post body. Safe to hand straight to dangerouslySetInnerHTML. */
export function renderPostMarkdown(md: string): string {
  const raw = renderMarkdownUnsanitised(md);
  if (!raw) return "";
  return sanitizeHtml(raw, SANITIZE_OPTIONS);
}

/** Re-exported so server callers need only one markdown import. */
export { readingMinutes };
